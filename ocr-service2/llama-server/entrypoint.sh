#!/usr/bin/env bash
set -euo pipefail
mkdir -p /app/models
if [ ! -f /app/models/PaddleOCR-VL-1.6-GGUF.gguf ]; then
    echo "Downloading GGUF weights (one-time, ~1.8GB)..."
    curl -L -o /app/models/PaddleOCR-VL-1.6-GGUF.gguf \
        "https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6-GGUF/resolve/main/PaddleOCR-VL-1.6-GGUF.gguf"
    curl -L -o /app/models/PaddleOCR-VL-1.6-GGUF-mmproj.gguf \
        "https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6-GGUF/resolve/main/PaddleOCR-VL-1.6-GGUF-mmproj.gguf"
fi
exec /app/bin/llama-server \
    --model /app/models/PaddleOCR-VL-1.6-GGUF.gguf \
    --mmproj /app/models/PaddleOCR-VL-1.6-GGUF-mmproj.gguf \
    --host 0.0.0.0 \
    --port 8081 \
    --threads "${LLAMA_THREADS:-7}" \
    --ctx-size 4096 \
    --temp 0