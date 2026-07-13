"""
test_pipeline_e2e.py -- NOT part of the deployed system. This mocks
ocr_engine.run_ocr() with the actual text these sample slips would
produce, so the full pipeline (alignment -> parsing -> validation ->
master-data learning) can be verified without a live PaddleOCR-VL call.
Your developer can delete this once real OCR is wired in and verified.
"""

import json
import os
import sys

import ocr_engine

# Realistic OCR text per sample photo, matching what PaddleOCR-VL produced
# for the Harsi Pump slip (real sample from this conversation) and
# plausible equivalent output for the 3 Multai Dump slips.
MOCK_OCR_TEXT = {
    "PHOTO-2026-07-08-13-55-06.jpg": """Tel.: 0731-4006026
2526
Date: 08/07/26 ACCRETION Loading Slip No.:178115
Godown Name : Harsi Pump
Please Load .....100... Bags of PPC/WPC/SUPER.PPC
Block No.: 04 Week No.....
Vehicle No.: MP05AJ3109 DI: 8818
Supply to M/s.....Patel Sales
Validity of Loading Slip (Santalai
Material Load on .....Palgoods""",

    "Screenshot_2026-07-09_at_3_12_21_PM.png": """Tel.: 0731-4006026
2324
Date : 07/07/26 ACCRETION Loading Slip No.37682
Godown Name : Multai Dump
Please Load .220... Bags of PPC/WPC/SUPER..PPC
Block No.: Crossing Week No..27
Vehicle No.: MP28GO117 DI: 665728982
Supply to M/s.....
Validity of Loading Slip OM SAI B.
Material Load on .....07/7/26 ( MASOD )""",

    "Screenshot_2026-07-09_at_3_12_21_PM_2.png": """Tel.: 0731-4006026
2324
Date : 07/7/26 ACCRETION Loading Slip No.37681
Godown Name : Multai Dump
Please Load .200... Bags of PPC/WPC/SUPER.W.P.
Block No.: 01 Week No..27
Vehicle No.: MP48H1244 DI: 66571988771
Supply to M/s.....OM SAI B.
Validity of Loading Slip
Material Load on .....07/7/26 ( MORKHA )""",

    "Screenshot_2026-07-09_at_3_13_21_PM.png": """Tel.: 0731-4006026
2324
Date : 08/7/26 ACCRETION Loading Slip No.37683
Godown Name : Multai Dump
Please Load .160... Bags of PPC/WPC/SUPER.PPC
Block No.: 02 Week No..25
Vehicle No.: MP28GO717 DI: 66571888751
Supply to M/s.....OM SAI B.
Validity of Loading Slip
Material Load on .....8/7/26 ( HIWARKHAD )""",
}


_current_photo = {"path": None}


def mock_run_ocr(image_path):
    key = os.path.basename(_current_photo["path"])
    if key in MOCK_OCR_TEXT:
        return MOCK_OCR_TEXT[key]
    raise KeyError(f"No mock OCR text registered for {key}")


# monkeypatch BEFORE importing pipeline, since pipeline imports run_ocr by name
ocr_engine.run_ocr = mock_run_ocr

from pipeline import SlipPipeline  # noqa: E402

if __name__ == "__main__":
    master_path = "/tmp/e2e_master_data.json"
    if os.path.exists(master_path):
        os.remove(master_path)

    pipeline = SlipPipeline(master_data_path=master_path)

    photos = [
        "/mnt/user-data/uploads/PHOTO-2026-07-08-13-55-06.jpg",
        "/mnt/user-data/uploads/Screenshot_2026-07-09_at_3_12_21_PM.png",
        "/mnt/user-data/uploads/Screenshot_2026-07-09_at_3_12_21_PM_2.png",
        "/mnt/user-data/uploads/Screenshot_2026-07-09_at_3_13_21_PM.png",
    ]

    for p in photos:
        print(f"\n{'='*70}\n{os.path.basename(p)}\n{'='*70}")
        _current_photo["path"] = p
        import pipeline as pipeline_module
        pipeline_module.run_ocr = mock_run_ocr
        record = pipeline.process_image(p)
        print(json.dumps(
            {k: v for k, v in record.items() if k not in ("_raw_ocr_text",)},
            indent=2, ensure_ascii=False))

    pipeline.save_master_data()

    print(f"\n\n{'='*70}\nFINAL MASTER DATA STATE\n{'='*70}")
    print(json.dumps({name: ml.to_dict() for name, ml in pipeline.store.lists.items()},
                      indent=2, ensure_ascii=False))
