"""
date_utils.py

Date handling for slip fields: normalize whatever format OCR produced into
a canonical ISO date for the database, and catch plausible-but-wrong reads
(a single wrong digit that still LOOKS like a valid date) via cross-field
and range checks that pattern matching alone can't catch.

Formats seen across real samples in this project: "08/07/26", "8/7/26",
"07/7/26", "08.07.26", digits occasionally OCR'd with an extra/missing
digit. All are DD/MM/YY(YY) -- this business is India-based and the
printed form doesn't use MM/DD, so that ambiguity doesn't apply here.
"""

import re
from datetime import datetime, timedelta

DATE_PATTERNS = [
    "%d/%m/%y", "%d/%m/%Y",
    "%d-%m-%y", "%d-%m-%Y",
    "%d.%m.%y", "%d.%m.%Y",
]

# Loosely matches DD/MM/YY(YY) with /, -, or . separators, 1-2 digit day/month.
DATE_FINDER_RE = re.compile(r"(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})")


def parse_date(raw: str, reference_year_window: int = 5):
    """Parse a slip date string into a `date` object, or None if it doesn't
    look like a valid date at all. Handles 2-digit years by assuming the
    2000s (this business's records don't predate that)."""
    if not raw:
        return None
    raw = raw.strip()

    for fmt in DATE_PATTERNS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue

    # Fall back to a looser regex for OCR-mangled separators/spacing
    m = DATE_FINDER_RE.search(raw)
    if not m:
        return None
    day, month, year = m.groups()
    day, month = int(day), int(month)
    if len(year) == 2:
        year = 2000 + int(year)
    elif len(year) == 4:
        year = int(year)
    else:
        return None  # 1 or 3-digit year is an OCR garble, not a real date
    try:
        return datetime(year, month, day).date()
    except ValueError:
        return None


def normalize_date(raw: str) -> str:
    """Returns ISO 'YYYY-MM-DD' for DB storage, or '' if unparseable."""
    d = parse_date(raw)
    return d.isoformat() if d else ""


def validate_date_field(raw: str, today: datetime = None, max_future_days: int = 3,
                         max_past_days: int = 365) -> dict:
    """Sanity-range check a single date field: catches OCR reads that parse
    fine as A date but land somewhere implausible (e.g. next century, or a
    year old) -- something a regex format check alone won't catch."""
    d = parse_date(raw)
    if d is None:
        return {"value": raw, "status": "invalid_date_format" if raw else "empty"}

    today = (today or datetime.now()).date()
    delta_days = (d - today).days
    if delta_days > max_future_days:
        return {"value": d.isoformat(), "status": "date_too_far_future"}
    if delta_days < -max_past_days:
        return {"value": d.isoformat(), "status": "date_too_far_past"}
    return {"value": d.isoformat(), "status": "valid_date"}


def cross_check_dates(date_a_raw: str, date_b_raw: str, max_days_apart: int = 2):
    """`date` and `material_load_on` match on every sample slip seen in this
    project -- a mismatch is a strong signal one of them has a
    plausible-but-wrong digit (e.g. "08/07/21" instead of "08/07/26"),
    which format validation alone can't catch since both LOOK like valid
    dates. Returns (ok: bool, detail: str)."""
    d1, d2 = parse_date(date_a_raw), parse_date(date_b_raw)
    if d1 is None or d2 is None:
        return True, "skipped (one or both unparseable)"  # let per-field validation flag it instead
    apart = abs((d1 - d2).days)
    if apart > max_days_apart:
        return False, f"{apart} days apart (date={d1.isoformat()}, material_load_on={d2.isoformat()})"
    return True, f"{apart} days apart"


if __name__ == "__main__":
    samples = ["08/07/26", "8/7/26", "07/7/26", "08.07.26", "8/7/126", "08/07/21", "not a date", ""]
    print("-- parse_date / normalize_date --")
    for s in samples:
        print(f"{s!r:15s} -> parsed={parse_date(s)}  normalized={normalize_date(s)!r}")

    print("\n-- validate_date_field (reference 'today' = 2026-07-09) --")
    ref_today = datetime(2026, 7, 9)
    for s in samples:
        print(f"{s!r:15s} -> {validate_date_field(s, today=ref_today)}")

    print("\n-- cross_check_dates --")
    print("date='08/07/26', material_load_on='08/07/26':", cross_check_dates("08/07/26", "08/07/26"))
    print("date='08/07/21', material_load_on='08/07/26':", cross_check_dates("08/07/21", "08/07/26"))
