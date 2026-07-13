"""
slip_aligner.py  (v4 -- alignment only, no field cropping)

Full-slip VLM OCR (PaddleOCR-VL, etc.) reads using layout AND language
context, so it doesn't need -- and is actively hurt by -- being fed rigid
pre-cropped fields. All the per-field cropping logic from earlier versions
is removed. This script does exactly one job: turn a photo of the slip
into one clean, upright, background-free image, ready to hand to the VLM
in a single call along with extraction_prompt.txt.

Usage:
    python slip_aligner.py path/to/photo.jpg out_dir/
    # -> out_dir/aligned.jpg  -- feed this + extraction_prompt.txt to your VLM
"""

import argparse
import os

import cv2
import numpy as np
from PIL import Image, ImageOps

CANONICAL_SIZE = (1000, 1300)


def load_image_exif_safe(path: str) -> np.ndarray:
    pil_img = Image.open(path)
    pil_img = ImageOps.exif_transpose(pil_img)
    rgb = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def order_points(pts: np.ndarray) -> np.ndarray:
    pts = pts.reshape(4, 2)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    tl, br = pts[np.argmin(s)], pts[np.argmax(s)]
    tr, bl = pts[np.argmin(diff)], pts[np.argmax(diff)]
    return np.array([tl, tr, br, bl], dtype="float32")


def _largest_quad_from_contours(cnts, total_area, min_area_ratio):
    cnts = [c for c in cnts if cv2.contourArea(c) > total_area * min_area_ratio]
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
    for c in cnts:
        peri = cv2.arcLength(c, True)
        for eps in (0.02, 0.03, 0.015, 0.04, 0.01):
            approx = cv2.approxPolyDP(c, eps * peri, True)
            if len(approx) == 4 and cv2.isContourConvex(approx):
                return approx.astype("float32")
        rect = cv2.minAreaRect(c)
        return cv2.boxPoints(rect).astype("float32").reshape(4, 1, 2)
    return None


def find_border_box_quad(img: np.ndarray, min_area_ratio: float = 0.08):
    """Primary: detect the printed navy-blue rule box by ink color -- robust
    to torn paper edges and variable photo framing (see earlier notes)."""
    h, w = img.shape[:2]
    scale = 800.0 / max(h, w)
    small = cv2.resize(img, (int(w * scale), int(h * scale)))
    total_area = small.shape[0] * small.shape[1]

    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([90, 30, 0]), np.array([135, 255, 190]))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8), iterations=3)
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=1)

    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    quad = _largest_quad_from_contours(cnts, total_area, min_area_ratio)
    return (quad / scale) if quad is not None else None


def find_paper_quad(img: np.ndarray, min_area_ratio: float = 0.15):
    """Fallback: physical paper edge (Canny + Otsu)."""
    h, w = img.shape[:2]
    scale = 800.0 / max(h, w)
    small = cv2.resize(img, (int(w * scale), int(h * scale)))
    total_area = small.shape[0] * small.shape[1]
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (7, 7), 0)

    candidates = []
    edged = cv2.dilate(cv2.Canny(blur, 50, 150), np.ones((5, 5), np.uint8), iterations=2)
    cnts, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates.extend(cnts)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    cnts2, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates.extend(cnts2)

    quad = _largest_quad_from_contours(candidates, total_area, min_area_ratio)
    return (quad / scale) if quad is not None else None


def find_slip_quad(img: np.ndarray):
    quad = find_border_box_quad(img)
    method = "border_box"
    if quad is None:
        quad = find_paper_quad(img)
        method = "paper_edge"
    return quad, method


def warp_to_canonical(img: np.ndarray, quad: np.ndarray, out_size=CANONICAL_SIZE) -> np.ndarray:
    pts = order_points(quad)
    W, H = out_size
    dst = np.array([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(pts, dst)
    return cv2.warpPerspective(img, M, (W, H))


def draw_quad_debug(img, quad):
    h, w = img.shape[:2]
    scale = 800.0 / max(h, w)
    small = cv2.resize(img, (int(w * scale), int(h * scale)))
    disp_quad = (quad.reshape(4, 2) * scale).astype(int)
    cv2.drawContours(small, [disp_quad], -1, (0, 0, 255), 3)
    return small


def align_slip(image_path: str, min_quad_area_ratio=0.06, max_quad_area_ratio=1.0,
                debug_path: str = None):
    """debug_path: if given, always writes a quad-overlay debug image there
    (also auto-written next to a low_confidence result if debug_path is a
    directory) so a flagged photo can be diagnosed at a glance.

    Note on max_quad_area_ratio=1.0: a detected quad that fills the ENTIRE
    frame is not necessarily a failure -- it's expected and correct for
    already-cropped inputs like screenshots with no background margin.
    What actually indicates failure is find_slip_quad() returning None
    (handled separately as "no_quad_found"), not a large-but-genuine quad."""
    img = load_image_exif_safe(image_path)
    quad, method = find_slip_quad(img)
    if quad is None:
        return None, "no_quad_found"
    h, w = img.shape[:2]
    area_frac = cv2.contourArea(quad.astype(np.float32)) / (h * w)
    status = (f"ok (method={method})" if min_quad_area_ratio <= area_frac <= max_quad_area_ratio
              else f"low_confidence (area_frac={area_frac:.2f}, method={method})")
    warped = warp_to_canonical(img, quad)

    if debug_path:
        import os
        base = os.path.basename(image_path)
        out_path = (os.path.join(debug_path, f"debug_{base}")
                    if os.path.isdir(debug_path) else debug_path)
        cv2.imwrite(out_path, draw_quad_debug(img, quad))

    return warped, status


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Align a goods-outward slip photo for VLM OCR.")
    parser.add_argument("image")
    parser.add_argument("out_dir")
    args = parser.parse_args()

    warped, status = align_slip(args.image)
    os.makedirs(args.out_dir, exist_ok=True)
    if warped is None:
        print(f"FAILED to detect the slip boundary -- flag '{args.image}' for manual review.")
        raise SystemExit(1)

    out_path = os.path.join(args.out_dir, "aligned.jpg")
    cv2.imwrite(out_path, warped)
    print(f"Status: {status}")
    print(f"Wrote {out_path} -- feed this + extraction_prompt.txt to your VLM in one call.")
    if "low_confidence" in status:
        print("WARNING: alignment confidence is low for this photo -- route to manual review.")
