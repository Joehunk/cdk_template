#!/usr/bin/env bash

rm -rf ./gensrc && \
  mkdir -p ./gensrc && \
  protoc \
    --ts_out=./gensrc --proto_path=./src/proto \
    --ts_opt force_client_none \
    -I ./node_modules/google-proto-files \
    ./src/proto/com/example/*.proto \
    ./src/proto/validate/validate.proto \
    google/protobuf/timestamp.proto \
    google/protobuf/duration.proto \
    google/api/annotations.proto \
    google/api/http.proto
