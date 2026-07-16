#!/usr/bin/env bash
#
# stop_llama_server.sh -- stops the background llama-server started by
# setup_llama_server.sh.

cd "$(dirname "$0")"

if [ -f llama_server.pid ]; then
    pid="$(cat llama_server.pid)"
    if kill "$pid" 2>/dev/null; then
        echo "Stopped llama-server (PID $pid)"
    else
        echo "No process $pid found (already stopped?)"
    fi
    rm -f llama_server.pid
else
    echo "No llama_server.pid found -- is it running?"
fi
