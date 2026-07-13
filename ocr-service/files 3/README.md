# Goods-Outward Slip OCR System

Photo -> aligned image -> PaddleOCR-VL text -> parsed fields -> validated
& auto-corrected fields -> one JSON record ready for DB insert.

## Files

| File | Purpose |
|---|---|
| `aligner.py` | Deskews the photo and crops to the printed border box. |
| `ocr_engine.py` | Runs PaddleOCR-VL on the aligned image, returns raw text. |
| `field_parser.py` | Regex-parses the raw text into named fields. |
| `date_utils.py` | Parses/normalizes dates, range-checks them, cross-checks `date` vs `material_load_on`. |
| `master_data.py` | Persistent master-list validation + safe two-tier auto-learning. |
| `pipeline.py` | Wires all of the above together into one record per slip. |
| `main.py` | CLI: single image or a batch folder -> JSON. |
| `test_pipeline_e2e.py` | Runs the pipeline against 4 real sample slips with mocked OCR text (no live PaddleOCR-VL call) -- **not part of the deployed system**, delete once real OCR is verified working. Useful as a reference for how the pieces fit together. |

## Setup

```bash
pip install opencv-python-headless pillow numpy rapidfuzz
# paddleocr / paddlepaddle-gpu: already installed per your setup
```

## Running

Single slip:
```bash
python main.py path/to/photo.jpg
```

Batch (a folder of photos):
```bash
python main.py path/to/photos_folder/ --batch -o results.json
```

Master data persists to `master_data.json` next to these scripts by
default (`--master-data path/to/file.json` to change it). It's created
automatically on first run.

## Before production use

**Seed your real master data.** Right now `MASTER_FIELD_CONFIG` in
`pipeline.py` starts every list empty (except `material_type`, seeded with
`PPC`/`WPC`/`SUPER`). Every first sighting of any real godown or
transporter name will come back flagged for review until it's been seen
twice (see "How validation works" below) -- to skip that ramp-up, seed
known values directly:

```python
# in pipeline.py, MASTER_FIELD_CONFIG
"godown_name": {"seed": ["Harsi Pump", "Multai Dump", ...], "validator": is_nonempty_text},
"supply_to":   {"seed": ["Quality Hardware", "OM SAI B.", ...], "validator": is_nonempty_text},
```
Seeds only apply the first time (when `master_data.json` doesn't exist
yet or has no data for that field) -- they won't overwrite what the system
has already learned.

## How validation works

**Fuzzy-corrected fields** (`godown_name`, `supply_to`, `material_type`):
- A new OCR read is fuzzy-matched against the **confirmed** list. Close
  enough (default 85% similarity) -> auto-corrected to the confirmed
  spelling.
- No confirmed match -> checked against **candidates** (values seen
  before but not yet trusted). A 2nd occurrence promotes it to confirmed
  automatically.
- No match anywhere -> becomes a new candidate (flagged for review, not
  yet used for auto-correction).

This means a single bad OCR read can never permanently corrupt the master
file -- it only gets trusted once something recurs, or a human confirms it
directly via `store.get("godown_name").confirm("Some Value")`.

**Exact-match fields** (`vehicle_no`, `slip_no`): deliberately NOT
fuzzy-corrected. Tested against real data in development: two genuinely
different vehicle plates from different slips scored a *higher* fuzzy
similarity than a confirmed real OCR-error pair needing correction. Since
every character in a plate/slip number is individually meaningful (unlike
a name, where minor spelling variation is normal), fuzzy-correcting these
risks silently misattributing a dispatch to the wrong vehicle, or merging
two different slip numbers into one. So:
- `vehicle_no`: format-validated (Indian plate pattern) and trusted
  immediately if well-formed; only an exact repeat is treated as "known."
- `slip_no`: exact-match duplicate detection -- flags if the same slip
  number has already been processed (catches the same physical slip being
  uploaded/processed twice).

**Numeric fields** (`bags_qty`, `block_no`, `week_no`, `di_no`): simple
"is this actually a number" check -- no master list, since these vary
freely slip to slip.

**Date fields** (`date`, `material_load_on`): parsed and normalized to
ISO format, range-checked against today's date, and cross-checked against
each other -- these two fields match on every real sample slip seen during
development, so a mismatch is a strong signal one of them has a
plausible-but-wrong digit (something format validation alone can't catch,
since both readings still look like valid dates).

## Output record shape

Every field appears twice: as the clean top-level value (e.g.
`"godown_name": "Multai Dump"`) and as `_<field>_status` explaining how it
got there (`"confirmed"`, `"corrected"`, `"new_candidate"`,
`"invalid_format"`, etc.). `_flagged_fields` lists everything that should
get a human's eyes before the record is trusted; `_status` is `"ok"` if
that list is empty, `"needs_review"` otherwise. `_notes` has plain-English
explanations for anything auto-learned or flagged.

## Adjusting the safe-learning thresholds

In `master_data.py`, per field in `MasterList`:
- `high_threshold` (default 85): how close a read must be to a confirmed
  value to auto-correct to it. Raise it if you're seeing false-positive
  corrections; lower it if genuine OCR noise isn't getting caught.
- `promote_after` (default 2): how many times a new value must recur
  before it's trusted for auto-correction. Raise it for extra caution on
  a field with a lot of near-duplicate values.

## Known limitation

`field_parser.py`'s regex patterns assume the printed label text
("Godown Name :", "Vehicle No. :", etc.) comes through PaddleOCR-VL
reasonably cleanly -- they were tuned against the sample slips seen during
development. If a differently-formatted slip (different print run,
different form layout) comes through, check `_raw_fields` in the output
record against `_raw_ocr_text` to see whether the parser missed something,
and adjust the regex in `field_parser.py` accordingly.
