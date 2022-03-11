#!/usr/bin/env bash

rm -rf ./gensrc && \
  mkdir -p ./gensrc && \
  protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_opt=outputSchema=true --ts_proto_opt=outputSchema=true \
    --ts_proto_opt=oneof=unions \
    --ts_proto_out=./gensrc --proto_path=./src/proto ./src/proto/com/example/*.proto
