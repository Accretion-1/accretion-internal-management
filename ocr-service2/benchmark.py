#!/usr/bin/env python3
"""
benchmark.py

Standalone (non-Colab) benchmark for comparing PaddleOCR-VL backends --
"native" (current production config: in-process CPU inference, see
ocr-service/files 3/ocr_engine.py) vs. "llama-cpp-server" (quantized GGUF
served by a local llama-server, started via setup_llama_server.sh) -- on
real slip photos.

Reuses the PRODUCTION aligner.py and field_parser.py from
ocr-service/files 3 (imported read-only, nothing there is modified) so
results are directly comparable to what ocr-service actually does --
not a reimplementation that could silently diverge.

Usage:
    # current production backend
    python benchmark.py --backend native --limit 10

    # GGUF backend (run setup_llama_server.sh first)
    python benchmark.py --backend llama-cpp-server --limit 10

    # then compare the two reports:
    python compare_reports.py report_native.json report_llama_cpp_server.json
"""
import argparse
import glob
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

PROD_FILES3 = Path(__file__).resolve().parent.parent / "ocr-service" / "files 3"
if str(PROD_FILES3) not in sys.path:
    sys.path.insert(0, str(PROD_FILES3))

from aligner import align_slip            # noqa: E402  (production code, read-only)
from field_parser import parse_ocr_text   # noqa: E402  (production code, read-only)

DEFAULT_IMAGES_DIR = Path(__file__).resolve().parent.parent / "ocr-service" / "uploads"


def build_pipeline(backend: str, server_url: str, threads: Optional[int]):
    from paddleocr import PaddleOCRVL

    kwargs = {"pipeline_version": "v1.6"}
    if backend == "llama-cpp-server":
        kwargs["vl_rec_backend"] = "llama-cpp-server"
        kwargs["vl_rec_server_url"] = server_url
    if threads:
        kwargs["cpu_threads"] = threads

    t0 = time.perf_counter()
    pipeline = PaddleOCRVL(**kwargs)
    load_s = time.perf_counter() - t0
    return pipeline, load_s


def run_ocr(pipeline, image_path: str):
    t0 = time.perf_counter()
    output = pipeline.predict(image_path)
    with tempfile.TemporaryDirectory() as tmp:
        for res in output:
            res.save_to_markdown(save_path=tmp)
        md_files = glob.glob(os.path.join(tmp, "*.md"))
        text = "\n".join(open(f, encoding="utf-8").read() for f in md_files)
    return text, time.perf_counter() - t0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--images-dir", default=str(DEFAULT_IMAGES_DIR),
                     help="Folder of slip photos to test (default: production ocr-service/uploads)")
    ap.add_argument("--limit", type=int, default=10, help="Max number of images to process")
    ap.add_argument("--backend", choices=["native", "llama-cpp-server"], required=True)
    ap.add_argument("--server-url", default="http://127.0.0.1:8081/v1",
                     help="llama-server URL (only used for --backend llama-cpp-server)")
    ap.add_argument("--threads", type=int, default=None,
                     help="cpu_threads passed to PaddleOCRVL; default = library default (set this to your "
                          "actual core count, e.g. 8, to avoid the library's hardcoded default of 10)")
    ap.add_argument("-o", "--output", default=None, help="Report JSON path (default: report_<backend>.json)")
    args = ap.parse_args()

    paths = sorted(
        p for ext in ("*.jpg", "*.jpeg", "*.png")
        for p in glob.glob(os.path.join(args.images_dir, ext))
    )[: args.limit]
    if not paths:
        sys.exit(f"No images found in {args.images_dir}")

    print(f"Backend={args.backend}  threads={args.threads or 'library default'}  images={len(paths)}")
    pipeline, load_s = build_pipeline(args.backend, args.server_url, args.threads)
    print(f"Pipeline init: {load_s:.2f}s\n")

    results = []
    for i, path in enumerate(paths, 1):
        name = os.path.basename(path)
        print(f"[{i}/{len(paths)}] {name} ...", end=" ", flush=True)

        t0 = time.perf_counter()
        warped, align_status = align_slip(path)
        align_s = time.perf_counter() - t0

        if warped is None:
            print(f"ALIGNMENT FAILED ({align_status})")
            results.append({
                "photo": name,
                "alignment_status": align_status,
                "alignment_seconds": round(align_s, 3),
                "error": "alignment_failed",
            })
            continue

        import cv2
        with tempfile.TemporaryDirectory() as tmp:
            aligned_path = os.path.join(tmp, "aligned.jpg")
            cv2.imwrite(aligned_path, warped)
            raw_text, ocr_s = run_ocr(pipeline, aligned_path)

        fields = parse_ocr_text(raw_text)
        print(f"align={align_s:.2f}s ocr={ocr_s:.2f}s")

        results.append({
            "photo": name,
            "alignment_status": align_status,
            "alignment_seconds": round(align_s, 3),
            "ocr_seconds": round(ocr_s, 2),
            "raw_text": raw_text,
            "fields": fields,
        })

    ocr_times = [r["ocr_seconds"] for r in results if "ocr_seconds" in r]
    report = {
        "backend": args.backend,
        "threads": args.threads,
        "pipeline_init_seconds": round(load_s, 2),
        "image_count": len(paths),
        "succeeded": len(ocr_times),
        "failed": len(results) - len(ocr_times),
        "avg_ocr_seconds": round(sum(ocr_times) / len(ocr_times), 2) if ocr_times else None,
        "min_ocr_seconds": round(min(ocr_times), 2) if ocr_times else None,
        "max_ocr_seconds": round(max(ocr_times), 2) if ocr_times else None,
        "results": results,
    }

    out_path = args.output or f"report_{args.backend.replace('-', '_')}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {out_path}")
    print(f"OCR time: avg={report['avg_ocr_seconds']}s  min={report['min_ocr_seconds']}s  "
          f"max={report['max_ocr_seconds']}s  over {report['succeeded']}/{report['image_count']} images "
          f"({report['failed']} alignment failures)")


if __name__ == "__main__":
    main()
