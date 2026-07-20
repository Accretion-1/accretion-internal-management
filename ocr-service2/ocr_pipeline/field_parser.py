"""
parse_ocr_output.py

PaddleOCR-VL's official interface (PaddleOCRVL pipeline / task="ocr") only
outputs a reading-order text/markdown dump -- it has no custom-prompt mode
to ask for a specific JSON schema directly. This module bridges that gap:
it takes the raw text dump and structures it into the field schema used by
validate_and_correct.py, using the label text (which prints consistently)
as anchors -- the same principle as the label-anchoring approach used for
image cropping earlier, just applied to text instead of pixels.
"""

import html
import re

FIELD_PATTERNS = {
    "date":             r"Date\s*:?\s*([0-9]{1,2}[/.\-][0-9]{1,2}[/.\-][0-9]{2,4})",
    "bags_qty":         r"Please\s*Load\s*:?\s*[ \t.]*([0-9]+)",
    "material_type":    r"PPC[\s/]*WPC[\s/]*SUPER\.?[ \t]*([A-Za-z.]*)",
    "vehicle_no":       r"Vehicle\s*No\.?\s*:?\s*([A-Z0-9 ]+?)(?:\s+DI\b|\n|$)",
    "di_no":            r"\bDI\s*:?\s*([0-9]+)",
    "supply_to":        r"Supply\s*to\s*M/?s\.?\s*:?\s*[ \t.]*([A-Za-z0-9 .&/-]*?)(?:\n|$)",
    "validity":         r"Validity\s*of\s*Loading\s*Slip\s*:?\s*[ \t.]*([A-Za-z0-9 .&/-]*?)(?:\n|$)",
    "material_load_on": r"Material\s*Load\s*on\s*:?\s*[ \t.]*([0-9]{1,2}[/.\-][0-9]{1,2}[/.\-][0-9]{2,4})",
}

# Placeholders PaddleOCR-VL emits for a visually blank field (dots/underscores
# left on the printed line with no handwriting) -- normalize these to "".
BLANK_PLACEHOLDER_RE = re.compile(r"^[_.\s]*$")
HTML_TAG_RE = re.compile(r"<[^>]+>")
HTML_ARTIFACT_RE = re.compile(r"</?(?:table|thead|tbody|tfoot|tr|td|th|div|span|p|br)\b", re.IGNORECASE)


def _clean(value: str) -> str:
    value = html.unescape(value or "")
    value = HTML_TAG_RE.sub(" ", value)
    value = re.sub(r"\s+", " ", value).strip(" .")
    if not value or BLANK_PLACEHOLDER_RE.match(value) or HTML_ARTIFACT_RE.search(value):
        return ""
    return value

# Block No. / Week No. share a line and both can be blank -- handle separately.
BLOCK_WEEK_RE = re.compile(
    r"Block\s*No\.?\s*:?\s*([^\sW][\w]*)?\s*Week\s*No\.?\s*:?\s*([^\s]*)?", re.IGNORECASE)

# Godown Name sometimes has the slip number merged onto the same line by the
# reading-order dump (as in the sample) -- a long trailing digit run (6+
# digits) glued onto the end is almost certainly that, not part of the name.
GODOWN_RE = re.compile(
    r"Godown\s*Name\s*:?\s*(.*?)"
    r"(?=\s*(?:Please\s*Load|Block\s*No\.?|Vehicle\s*No\.?|Supply\s*to|Validity\s*of\s*Loading\s*Slip|Material\s*Load\s*on|Signature|</tr>|</td>|$))",
    re.IGNORECASE | re.DOTALL,
)
# Allow one stray trailing letter after the digit run (e.g. a final "0"
# misread as "C") so a single-character OCR slip doesn't leave the whole
# digit run stuck inside godown_name -- observed on real llama-cpp-server
# backend output ("...15930157C"). The digit group itself may still carry
# that OCR error (this only fixes the SPLIT, not the misread digit).
TRAILING_DIGITS_RE = re.compile(r"(.*?)\s*([0-9]{6,})[A-Za-z]?\s*$")

# The slip's own serial number after "No.:" -- distinct from the small fixed
# 4-digit form code (e.g. "2526") that also appears near the top.
SLIP_NO_RE = re.compile(r"\bNo\.?:?\s*([0-9]{4,})")


def parse_ocr_text(text: str) -> dict:
    fields = {k: "" for k in [
        "slip_no", "date", "godown_name", "bags_qty", "material_type",
        "block_no", "week_no", "vehicle_no", "di_no", "supply_to",
        "validity", "material_load_on",
    ]}

    for name, pattern in FIELD_PATTERNS.items():
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            fields[name] = _clean(m.group(1))

    bw = BLOCK_WEEK_RE.search(text)
    if bw:
        fields["block_no"] = _clean(bw.group(1) or "")
        fields["week_no"] = _clean(bw.group(2) or "")

    gm = GODOWN_RE.search(text)
    if gm:
        raw = gm.group(1).strip(" .")
        split = TRAILING_DIGITS_RE.match(raw)
        if split and len(split.group(2)) >= 6:
            fields["godown_name"] = _clean(split.group(1))
            # a merged trailing number is very likely the slip_no the reading
            # order dump attached to the wrong line -- surface it as a
            # candidate rather than silently keeping it inside godown_name
            fields.setdefault("_slip_no_candidate_from_godown_line", split.group(2))
        else:
            fields["godown_name"] = _clean(raw)

    # slip_no: search lines near "Loading Slip" / "No." specifically, and
    # exclude any number that also appears as the small fixed form code
    # (heuristic: the fixed code is 4 digits, printed right after "Tel.:...").
    for m in SLIP_NO_RE.finditer(text):
        candidate = m.group(1)
        if len(candidate) >= 5:  # fixed form code is only 4 digits
            fields["slip_no"] = candidate
            break
    if not fields["slip_no"] and "_slip_no_candidate_from_godown_line" in fields:
        fields["slip_no"] = fields.pop("_slip_no_candidate_from_godown_line")

    return fields


if __name__ == "__main__":
    # The exact text you pasted from your PaddleOCR-VL run
    sample = """Tel.: 0731-4006026
2526
Date: 08/07/21 ACCRETION Loading Slip
Godown Name : Bbr. Beful 159301570
Please Load .....70... Bags of PPC/WPC/SUPER.
Block No.: ___ Week No.....
Vehicle No.: MP480A0646 DI: 88536
Supply to M/s.....QUALITY HARDWARE
Validity of Loading Slip
Material Load on .....08/07/26
Signature
Received by"""

    fields = parse_ocr_text(sample)
    for k, v in fields.items():
        print(f"{k:18s} -> {v!r}")
