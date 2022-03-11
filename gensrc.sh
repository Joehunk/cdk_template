#!/usr/bin/env bash

rm -rf ./gensrc && \
  mkdir -p ./gensrc && \
  protoc \
    --ts_out=./gensrc --proto_path=./src/proto \
    ./src/proto/com/example/*.proto \
    ./src/proto/validate/validate.proto \
    google/protobuf/timestamp.proto \
    google/protobuf/duration.proto
