#!/bin/sh

(cd bcplus; node tools/set_tables.js)
(cd evm; node tools/set_tables.js)
