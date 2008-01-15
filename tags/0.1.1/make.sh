#!/bin/bash

rm -r dist
mkdir dist
cat src/head.js \
    src/node.js \
    src/builtinobjects.js \
    src/parse.js \
    src/interpreter.js \
    src/builtinmethods.js \
    src/util.js > dist/jsruby.js

