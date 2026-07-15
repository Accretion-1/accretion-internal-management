#!/usr/bin/env bash
#
# setup_llama_server.sh
#
# Builds llama.cpp (CPU backend) and downloads the PaddleOCR-VL-1.6 GGUF
# weights, then starts llama-server in the background. Run this ONCE on
# the VPS before `python benchmark.py --backend llama-cpp-server`.
#
# Usage: ./setup_llama_server.sh [threads]
#   threads defaults to (nproc - 1), leaving one core free for the Python
#   side of the benchmark (matches the split used in the original Colab
#   test notebook).

set -euo pipefail
cd "$(dirname "$0")"

THREADS="${1:-$(( $(nproc) - 1 ))}"
PORT=8081

if [ ! -x "llama.cpp/build/bin/llama-server" ]; then
    echo "Building llama.cpp (CPU backend)..."
    if [ ! -d llama.cpp ]; then
        git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
    fi
    cmake -B llama.cpp/build -S llama.cpp
    cmake --build llama.cpp/build -j"$(nproc)" --target llama-server
else
    echo "llama-server already built, skipping build step."
fi

mkdir -p models
if [ ! -f models/PaddleOCR-VL-1.6-GGUF.gguf ]; then
    echo "Downloading PaddleOCR-VL-1.6 GGUF weights (~1.8GB total, one time)..."
    curl -L -o models/PaddleOCR-VL-1.6-GGUF.gguf \
        "https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6-GGUF/resolve/main/PaddleOCR-VL-1.6-GGUF.gguf"
    curl -L -o models/PaddleOCR-VL-1.6-GGUF-mmproj.gguf \
        "https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6-GGUF/resolve/main/PaddleOCR-VL-1.6-GGUF-mmproj.gguf"
else
    echo "GGUF weights already downloaded, skipping."
fi

if [ -f llama_server.pid ] && kill -0 "$(cat llama_server.pid)" 2>/dev/null; then
    echo "llama-server already running (PID $(cat llama_server.pid)) -- nothing to start."
    exit 0
fi

echo "Starting llama-server on port $PORT with $THREADS thread(s)..."
nohup llama.cpp/build/bin/llama-server \
    --model models/PaddleOCR-VL-1.6-GGUF.gguf \
    --mmproj models/PaddleOCR-VL-1.6-GGUF-mmproj.gguf \
    --host 127.0.0.1 \
    --port "$PORT" \
    --threads "$THREADS" \
    --ctx-size 4096 \
    --temp 0 \
    --mlock \
    > llama_server.log 2>&1 &

echo $! > llama_server.pid
echo "llama-server starting (PID $(cat llama_server.pid)), logging to llama_server.log"

echo -n "Waiting for it to become healthy"
for i in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
        echo ""
        echo "llama-server is ready on http://127.0.0.1:$PORT"
        exit 0
    fi
    echo -n "."
    sleep 5
done
echo ""
echo "Timed out waiting for llama-server -- check llama_server.log"
exit 1
