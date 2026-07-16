# ocr-service2

Two things live here:

1. **A production-grade OCR service** (`app.py` + `routes/` + `services/` +
   `ocr_pipeline/`) -- a drop-in replacement for `ocr-service`, structured
   identically to it, running the `llama-cpp-server` (quantized GGUF)
   backend instead of in-process fp32 weights. Built after benchmarking
   showed a real ~7-20x speedup on actual slip photos with a structurally
   identical response contract (verified below).
2. **Testing tools** (`api.py`, `benchmark.py`, `compare_reports.py`) --
   used to reach that decision and to keep validating it going forward.
   These stay separate from the production app on purpose (see "Files").

## Production service: setup and run

```bash
cd ocr-service2
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 1. build llama.cpp + download GGUF weights + start llama-server (one time;
#    safe to re-run, skips steps already done)
./setup_llama_server.sh 7      # thread count: leave 1-2 cores free for the
                                # Python/alignment side, e.g. 7 on an 8-core box

# 2. start the production app (mirrors ocr-service/app.py exactly)
export OCR_BACKEND=llama-cpp-server
export OCR_SERVER_URL=http://127.0.0.1:8081/v1
export OCR_CPU_THREADS=1
uvicorn app:app --host 0.0.0.0 --port 8000

# 3. from another terminal (or wherever godown_slips_cron.js will call it)
curl -X POST http://127.0.0.1:8000/ -F "file=@/path/to/slip.jpg"

# 4. when done testing
./stop_llama_server.sh
```

Response shape is `{count, texts, record}` -- identical to `ocr-service`'s
`POST /`, so `backend/services/godown_slips_cron.js` needs **zero code
changes** to point at this service instead (only `OCR_API_ROUTE` in
`backend/.env` changes, when you're ready to cut over).

**Order matters:** if `llama-server` gets restarted while `app.py` is still
running, restart `app.py` too -- a stale connection can return a mismatched
result. (The test-harness `api.py` below echoes `image_sha256` specifically
to catch this class of bug; the production app doesn't add that field since
it must stay contract-identical to `ocr-service`.)

### Structure (mirrors `ocr-service/` on purpose)

| This service | Production `ocr-service` equivalent | Notes |
|---|---|---|
| `app.py` | `app.py` | Identical structure; title/health text mentions the backend |
| `routes/ocr.py` | `routes/ocr.py` | Byte-for-byte identical logic -- same upload persistence, same `save_master_data()` call, same `{count, texts, record}` response, same timing logs |
| `services/ocr_service.py` | `services/ocr_service.py` | Identical, points at `ocr_pipeline/` instead of `files 3/` |
| `ocr_pipeline/` | `files 3/` | Forked copy of `pipeline.py`, `master_data.py`, `date_utils.py`, `field_parser.py`, `aligner.py` (unchanged) + `ocr_engine.py` (only file with a real difference -- talks to `llama-server` instead of loading fp32 weights in-process). Named properly instead of carrying over the original `files 3` folder name. |
| `ocr_pipeline/master_data.json` | `files 3/master_data.json` | Seeded from a copy of production's file at fork time, so already-learned godown/vehicle/supplier data isn't lost. **These two files will diverge over time** since each service now learns independently -- see "Known limitation" below. |

### Verified: real side-by-side test (2026-07-16, same photo, both services)

| | `ocr-service` (native) | `ocr-service2` (llama-cpp-server) |
|---|---|---|
| Total response time | 48.94s | **6.84s** (7.2x faster) |
| Top-level response keys | `count, record, texts` | `count, record, texts` -- **identical** |
| `record` keys | 27 keys | 27 keys -- **identical, zero divergence** |
| `_status` | `needs_review` | `needs_review` (both correctly flagged this photo) |
| `vehicle_no` | `M7P48AA0646` (OCR error, flagged) | `MP48AA0646` (correct, not flagged) |
| `slip_no` / `godown_name` | correct, split cleanly | merged together (`"Bo. Befu 15930157C"`) -- known `field_parser.py` regex edge case, see below |

Real per-stage timing captured from the production app's own logs (not
estimated): `alignment=32.0ms, ocr_inference=17697.5ms, field_parsing=0.9ms,
validation=0.4ms` for one photo, and separately `upload_save=0.00s,
master_data_save=0.00s` (both round to under 5ms) -- confirming the
master-data/date-validation layer adds negligible time regardless of which
OCR backend is underneath it; the response time is almost entirely the OCR
call itself.

### Known limitation carried over from the benchmark testing

When `llama-cpp-server`'s OCR reads a trailing digit run with a stray
character attached (e.g. `...15930157C` instead of `...159301570`),
`field_parser.py`'s `TRAILING_DIGITS_RE` (which only splits off *pure*
digit runs) fails to separate the slip number from `godown_name`, so
`slip_no` comes back empty and `godown_name` carries the extra digits.
This is a one-line regex fix in `field_parser.py` if you want to address it
-- not done here since this fork intentionally keeps that file unchanged
from production pending a decision on whether to fix it in both places or
just this one.

## Testing tools (how the above decision was reached)

The rest of this README covers `api.py`, `benchmark.py`, and
`compare_reports.py` -- kept separate from the production app so ongoing
backend comparisons don't touch what's actually serving traffic.

### `api.py` -- manual single-photo testing over HTTP

```bash
export OCR_BACKEND=llama-cpp-server   # or native
export OCR_SERVER_URL=http://127.0.0.1:8081/v1
export OCR_CPU_THREADS=1
uvicorn api:app --host 0.0.0.0 --port 8001

curl -X POST http://127.0.0.1:8001/ocr -F "file=@/path/to/slip.jpg"
```

Unlike the production app, this **never writes the upload to disk** (in-memory
+ auto-deleted temp file only) and **skips `master_data.py` entirely** --
it's a bare alignment+OCR+field-parser path for fast iteration, not a
production stand-in. Every response includes `image_sha256` so you can
verify a result actually corresponds to what you uploaded.

### `benchmark.py` / `compare_reports.py` -- batch comparison

```bash
python benchmark.py --backend native --threads 8 --limit 10
# -> report_native.json

./setup_llama_server.sh 7
python benchmark.py --backend llama-cpp-server --threads 1 --limit 10
# -> report_llama_cpp_server.json

python compare_reports.py report_native.json report_llama_cpp_server.json
```

Both benchmark runs default to `ocr-service/uploads/` (real accumulated
slip photos) with the same `--limit`, so reports cover identical photos
and are diffable. `compare_reports.py` prints timing (avg/min/max/speedup)
and **field-level agreement per photo**, with a specific call-out if
`vehicle_no`/`slip_no` differ (these two are deliberately not
fuzzy-corrected in production -- see `pipeline.py`'s module-level comment).
Agreement is not correctness -- both backends can agree on a wrong read;
spot-check against the physical slip before trusting either.

## Files

| File | Purpose |
|---|---|
| `app.py` | **Production entrypoint.** Drop-in replacement for `ocr-service/app.py`. |
| `routes/ocr.py` | **Production route.** Identical contract to `ocr-service/routes/ocr.py`. |
| `services/ocr_service.py` | **Production service wrapper.** Identical to `ocr-service/services/ocr_service.py`. |
| `ocr_pipeline/` | **Production pipeline modules**, forked from `ocr-service/files 3/`. Only `ocr_engine.py` intentionally differs (backend). |
| `api.py` | Test-harness endpoint (port 8001 by convention) for manual single-photo comparisons. Not used in production. |
| `benchmark.py` | Batch backend comparison over a folder of photos, writes a JSON report. |
| `compare_reports.py` | Diffs two `benchmark.py` reports on timing and per-field agreement. |
| `setup_llama_server.sh` | Builds llama.cpp, downloads GGUF weights, starts the server in the background. Idempotent. Used by both the production app and the testing tools. |
| `stop_llama_server.sh` | Stops the background llama-server. |
| `requirements.txt` | Pinned to versions validated during testing (`paddlepaddle==3.2.1`, `paddleocr[doc-parser]>=3.6.0`); a separate venv from `ocr-service/`'s. |
| `test_ocr_only-2.ipynb` | Original Colab exploration that `benchmark.py`/`api.py` replaced for real testing. Kept for reference. |

## What this does NOT do

- The production app (`app.py`) does **not** get automatically wired into `backend/.env`'s `OCR_API_ROUTE` -- that cutover is a deliberate, separate step you take when ready (see the migration plan discussed separately). `ocr-service` is untouched and still serving production traffic today.
- `ocr_pipeline/` and `ocr-service/files 3/` are now **independent copies** -- a future fix to one (e.g. the `field_parser.py` regex noted above) does not automatically apply to the other. Worth a periodic diff if both services stay in use.
- The testing tools (`api.py`, `benchmark.py`) still don't persist uploads or run `master_data.py` -- that's intentional, they're for fast iteration, not production behavior.
- Nothing here decides anything automatically -- the numbers above are real and verified, but the actual `OCR_API_ROUTE` cutover is a deliberate action, not something this tooling performs on its own.
