# OCR backend benchmark (native vs llama-cpp-server)

Standalone test harness -- **does not touch `ocr-service/`**, only imports
its `aligner.py` and `field_parser.py` read-only so results are directly
comparable to production. Built to answer one question on real hardware:
does switching `ocr-service`'s OCR backend from `native` (current, CPU,
fp32) to `llama-cpp-server` (quantized GGUF) actually help on your 8-core
VPS, without silently degrading field accuracy.

This replaces the earlier Colab notebook (`test_ocr_only-2.ipynb`), which
ran on a resource-starved 2-vCPU free-tier runtime (1 thread given to
llama-server) and produced inconsistent numbers (17.79s then 268.60s for
two different photos) plus visible OCR errors vs. the native backend --
not reliable evidence either way. This harness is meant to run directly
on the target VPS with real thread counts and a real photo batch.

## Quickstart (upload a photo, get OCR data back)

This is the fastest path to a working `/ocr` endpoint -- verified end-to-end
on real hardware, real weights, real photos.

```bash
cd ocr-service2
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 1. build llama.cpp + download GGUF weights + start llama-server (one time;
#    safe to re-run, skips steps already done)
./setup_llama_server.sh 7      # thread count: leave 1-2 cores free for the
                                # Python/alignment side, e.g. 7 on an 8-core box

# 2. start the API, pointed at that server
export OCR_BACKEND=llama-cpp-server
export OCR_SERVER_URL=http://127.0.0.1:8081/v1
export OCR_CPU_THREADS=1
uvicorn api:app --host 0.0.0.0 --port 8001

# 3. from another terminal (or another machine that can reach this host/port)
curl -X POST http://127.0.0.1:8001/ocr -F "file=@/path/to/slip.jpg"

# 4. when done
./stop_llama_server.sh
```

Prefer the current production backend instead (`native`, CPU fp32, no
llama-server needed at all)? Skip step 1 entirely:
```bash
export OCR_BACKEND=native
uvicorn api:app --host 0.0.0.0 --port 8001
```

**Order matters:** if `llama-server` ever gets restarted while `api.py` is
still running, restart `api.py` too -- an already-running API process can
hold a stale connection to the old server instance and return a mismatched
result. Every response includes `image_sha256` specifically so this is easy
to catch: `shasum -a 256 /path/to/slip.jpg` and compare against the field in
the response.

## Setup (detailed / VPS)

```bash
cd ocr-service2
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# also needs the SAME deps ocr-service/requirements.txt uses for alignment
# (opencv/pillow/numpy already above; aligner.py has no other deps)
```

## 1. Benchmark the current production backend (native)

No extra setup needed -- this exercises exactly what `ocr-service` runs today.

```bash
python benchmark.py --backend native --threads 8 --limit 10
# -> report_native.json
```

`--threads 8` matches your VPS's actual core count (production currently
leaves this at the library's hardcoded default of 10, which slightly
over-subscribes an 8-core box -- this alone is worth comparing against
`--threads` omitted, i.e. the current default, if you want to isolate
that effect separately from the backend switch).

## 2. Build + start llama-server, then benchmark that backend

```bash
./setup_llama_server.sh 7   # builds llama.cpp, downloads ~1.8GB GGUF weights,
                             # starts llama-server with 7 threads (leaves 1
                             # core for the Python/alignment side)

python benchmark.py --backend llama-cpp-server --threads 1 --limit 10
# -> report_llama_cpp_server.json

./stop_llama_server.sh      # when done testing
```

(`--threads 1` here is PaddleOCRVL's own `cpu_threads` for the layout
model that still runs in-process even with `llama-cpp-server` handling
the VL recognition step -- the heavy lifting goes to llama-server's own
`--threads 7`.)

Both benchmark runs use the same `--images-dir` by default
(`ocr-service/uploads/`, your real accumulated slip photos) and the same
`--limit`, so their reports cover identical photos and are diffable.

## 3. Compare

```bash
python compare_reports.py report_native.json report_llama_cpp_server.json
```

This prints:
- Timing: avg/min/max OCR seconds and the speedup ratio.
- **Field-level agreement per photo**, using the same `field_parser.py`
  regexes production uses -- so you see exactly which extracted fields
  (not just raw text) would change if you switched backends.
- A specific call-out if `vehicle_no` or `slip_no` differ between
  backends -- these two are deliberately *not* fuzzy-corrected in
  `ocr-service/files 3/pipeline.py` (see the module-level comment there),
  so a backend that reads them differently is a bigger risk than a
  backend that reads `godown_name` slightly differently.

**Agreement between backends is not the same as correctness** -- both can
agree on a wrong read. Spot-check a handful of photos against the actual
physical slip before deciding, not just against each other.

## 4. Hit it over HTTP instead of the CLI batch script

Covered above in Quickstart -- this section has the response shape and
details. `api.py` runs the same alignment/OCR/parsing logic as
`benchmark.py`, backend selectable via env var, one photo per request
instead of a batch.

**The uploaded image is never written to disk.** The upload is read into
memory, briefly staged in an auto-deleted temp file only for the duration
of the alignment call (`align_slip()` needs a file path), then discarded.
Nothing lands in an `uploads/` folder -- only the extracted OCR data is
returned.

Example response:
```json
{
  "status": "ok",
  "backend": "llama-cpp-server",
  "uploaded_filename": "slip.jpg",
  "image_sha256": "f926df65...",
  "alignment_status": "ok (method=border_box)",
  "timing_seconds": { "alignment": 0.03, "ocr": 2.73 },
  "count": 10,
  "texts": ["Tel.: 0731-4006026", "..."],
  "fields": { "slip_no": "", "date": "08/07/2023", "vehicle_no": "MP48AA0646", "..." : "..." },
  "raw_text": "Tel.: 0731-4006026\n\n..."
}
```

`image_sha256` is a correctness check, not decoration: compare it against
`shasum -a 256 /path/to/slip.jpg` to confirm a response actually corresponds
to the file you uploaded, rather than a stale cached result from a prior
request (this has happened when `api.py` outlives a `llama-server`
restart -- see the Quickstart note above).

**Note:** this is a test-harness endpoint for comparing backends, not a
replacement for the production OCR API. The existing production endpoint
(`ocr-service/routes/ocr.py`, `POST /`, consumed by
`backend/services/godown_slips_cron.js` via `OCR_API_ROUTE`) is unaffected
and still hardcoded to the `native` backend until you deliberately change
`ocr-service/files 3/ocr_engine.py` based on what these benchmarks show. It
also still persists uploads to `ocr-service/uploads/` -- that behavior was
intentionally only changed here in the test harness, not in production.

## Files

| File | Purpose |
|---|---|
| `setup_llama_server.sh` | Builds llama.cpp, downloads GGUF weights, starts the server in the background. Idempotent -- safe to re-run. |
| `stop_llama_server.sh` | Stops the background llama-server. |
| `benchmark.py` | Runs alignment + OCR + field parsing over a batch of photos for one backend, writes a JSON report. |
| `compare_reports.py` | Diffs two reports on timing and per-field agreement. |
| `api.py` | FastAPI wrapper for uploading one photo at a time over HTTP instead of running a batch -- same logic, backend selectable via `OCR_BACKEND` env var. |
| `requirements.txt` | Pinned to the versions the earlier Colab test validated (`paddlepaddle==3.2.1`, `paddleocr[doc-parser]>=3.6.0`) -- deliberately a separate venv from `ocr-service/`'s, so testing this doesn't touch the live service's environment. |
| `test_ocr_only-2.ipynb` | Original Colab exploration this harness replaces for real testing. Kept for reference. |

## What this does NOT do

- Doesn't touch `ocr-service/` (no writes, only read-imports of `aligner.py`/`field_parser.py`).
- `api.py` doesn't persist uploaded images anywhere -- processed in memory / a temp file, never saved. (`benchmark.py` doesn't upload anything either -- it reads existing photos from `--images-dir` for batch testing.)
- Doesn't run `master_data.py`'s fuzzy-learning/validation layer -- it compares raw field-parser output only, so results are about OCR+parsing accuracy, not the full pipeline's auto-correction behavior.
- Doesn't decide anything automatically -- it's a data-gathering tool. The actual backend switch (a one-line change to `ocr_engine.py`'s `PaddleOCRVL(...)` call) is a separate, deliberate step once you've reviewed the numbers.
