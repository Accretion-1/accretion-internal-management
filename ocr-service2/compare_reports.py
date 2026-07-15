#!/usr/bin/env python3
"""
compare_reports.py

Diffs two benchmark.py reports (e.g. native vs llama-cpp-server) on:
  1. Timing (avg/min/max OCR seconds, pipeline init).
  2. Field-level agreement per photo, using the SAME production
     field_parser.py both benchmark runs already used -- so this checks
     whether switching backends changes what the pipeline would actually
     extract, not just raw text similarity.

Speed alone is not a safe basis for this decision -- a faster backend
that silently corrupts vehicle_no or slip_no is worse than a slow one,
given ocr-service/files 3/pipeline.py deliberately does NOT fuzzy-correct
those two fields. This script surfaces exactly which fields would differ,
per photo, so that's a visible part of the decision.

Usage:
    python compare_reports.py report_native.json report_llama_cpp_server.json
"""
import argparse
import json

FIELDS_TO_COMPARE = [
    "slip_no", "date", "godown_name", "bags_qty", "material_type",
    "block_no", "week_no", "vehicle_no", "di_no", "supply_to",
    "validity", "material_load_on",
]

# These two are NOT fuzzy-corrected in production (see pipeline.py's
# EXACT_MATCH_FIELD_CONFIG note) -- a mismatch here is a bigger deal than
# a mismatch in e.g. godown_name, which auto-learns/self-corrects over time.
EXACT_MATCH_FIELDS = {"vehicle_no", "slip_no"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("report_a")
    ap.add_argument("report_b")
    args = ap.parse_args()

    a = json.load(open(args.report_a, encoding="utf-8"))
    b = json.load(open(args.report_b, encoding="utf-8"))

    print(f"=== Timing: {a['backend']} vs {b['backend']} ===")
    print(f"{a['backend']:20s} avg={a['avg_ocr_seconds']}s  min={a['min_ocr_seconds']}s  "
          f"max={a['max_ocr_seconds']}s  (init {a['pipeline_init_seconds']}s, threads={a['threads']})")
    print(f"{b['backend']:20s} avg={b['avg_ocr_seconds']}s  min={b['min_ocr_seconds']}s  "
          f"max={b['max_ocr_seconds']}s  (init {b['pipeline_init_seconds']}s, threads={b['threads']})")

    if a["avg_ocr_seconds"] and b["avg_ocr_seconds"]:
        speedup = a["avg_ocr_seconds"] / b["avg_ocr_seconds"]
        print(f"-> {b['backend']} averages {speedup:.2f}x the speed of {a['backend']} on this batch")
    print()

    by_photo_a = {r["photo"]: r for r in a["results"]}
    by_photo_b = {r["photo"]: r for r in b["results"]}
    common = sorted(set(by_photo_a) & set(by_photo_b))
    if not common:
        print("No photos in common between the two reports -- re-run both with the same "
              "--images-dir/--limit so they cover identical photos.")
        return

    print(f"=== Field-level agreement across {len(common)} shared photos ===")
    total_fields = 0
    mismatched_fields = 0
    exact_match_mismatches = 0
    photos_with_exact_mismatch = []

    for photo in common:
        ra, rb = by_photo_a[photo], by_photo_b[photo]
        fa, fb = ra.get("fields", {}), rb.get("fields", {})
        diffs = [f for f in FIELDS_TO_COMPARE if fa.get(f, "") != fb.get(f, "")]
        total_fields += len(FIELDS_TO_COMPARE)
        mismatched_fields += len(diffs)

        exact_diffs = [f for f in diffs if f in EXACT_MATCH_FIELDS]
        if exact_diffs:
            exact_match_mismatches += len(exact_diffs)
            photos_with_exact_mismatch.append(photo)

        if diffs:
            flag = "  [EXACT-MATCH FIELD DIFFERS]" if exact_diffs else ""
            print(f"\n{photo}: {len(diffs)} field(s) differ{flag}")
            for f in diffs:
                marker = "*" if f in EXACT_MATCH_FIELDS else " "
                print(f" {marker}{f:18s} {a['backend']}={fa.get(f, '')!r}  vs  {b['backend']}={fb.get(f, '')!r}")
        else:
            print(f"{photo}: fields match")

    agree_pct = 100 * (1 - mismatched_fields / total_fields) if total_fields else 0
    print(f"\nOverall field agreement: {agree_pct:.1f}% ({total_fields - mismatched_fields}/{total_fields} identical)")

    if exact_match_mismatches:
        print(f"\n⚠ {exact_match_mismatches} mismatch(es) in EXACT-MATCH fields (vehicle_no/slip_no) "
              f"across {len(photos_with_exact_mismatch)} photo(s): {', '.join(photos_with_exact_mismatch)}")
        print("  These fields are deliberately NOT fuzzy-corrected in production -- a backend that reads "
              "them differently risks misattributing a dispatch to the wrong vehicle or missing a real "
              "duplicate-slip flag. Spot-check these specific photos against the physical slip before "
              "trusting either backend's output for these fields.")

    print("\nNOTE: agreement != correctness -- both backends can agree on a wrong read. Spot-check a "
          "handful of photos against the real physical slip, not just against each other, before deciding.")


if __name__ == "__main__":
    main()
