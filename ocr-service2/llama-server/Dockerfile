FROM python:3.11-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    git cmake g++ build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build
RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
RUN cmake -B llama.cpp/build -S llama.cpp -DCMAKE_BUILD_TYPE=Release \
    && cmake --build llama.cpp/build -j"$(nproc)" --target llama-server

FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /build/llama.cpp/build/bin /app/bin
ENV LD_LIBRARY_PATH=/app/bin
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8081
ENTRYPOINT ["/app/entrypoint.sh"]