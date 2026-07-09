"""
main.py

CLI entrypoint.

Single slip:
    python main.py path/to/photo.jpg

Batch (a folder of photos):
    python main.py path/to/photos_folder/ --batch -o results.json

Master data persists to master_data.json (next to this script by default;
override with --master-data path/to/file.json). Seed it with your real
dealer/godown/fleet data before production use -- see README.md.
"""

import argparse
import glob
import json
import os
import sys

from pipeline import SlipPipeline


def main():
    parser = argparse.ArgumentParser(description="Process goods-outward slip photo(s) into DB-ready JSON.")
    parser.add_argument("input", help="A single image path, or a folder (use --batch)")
    parser.add_argument("--batch", action="store_true", help="Treat input as a folder of images")
    parser.add_argument("-o", "--output", default=None, help="Write JSON results here (default: stdout)")
    parser.add_argument("--master-data", default="master_data.json", help="Path to the master data JSON file")
    args = parser.parse_args()

    pipeline = SlipPipeline(master_data_path=args.master_data)

    if args.batch:
        paths = sorted(
            p for ext in ("*.jpg", "*.jpeg", "*.png")
            for p in glob.glob(os.path.join(args.input, ext))
        )
        if not paths:
            print(f"No images found in {args.input}", file=sys.stderr)
            sys.exit(1)
        results = []
        for p in paths:
            print(f"Processing {p} ...", file=sys.stderr)
            results.append(pipeline.process_image(p))
        output_data = results
    else:
        output_data = pipeline.process_image(args.input)

    # Persist any master-list learning from this run (new candidates,
    # promotions, newly-seen slip numbers) so the NEXT run benefits from it.
    pipeline.save_master_data()

    output_json = json.dumps(output_data, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"Wrote results to {args.output}", file=sys.stderr)
    else:
        print(output_json)

    # Quick summary to stderr so batch runs are skimmable
    records = output_data if isinstance(output_data, list) else [output_data]
    n_ok = sum(1 for r in records if r.get("_status") == "ok")
    n_review = len(records) - n_ok
    print(f"\n{len(records)} slip(s) processed: {n_ok} clean, {n_review} need review.", file=sys.stderr)


if __name__ == "__main__":
    main()
