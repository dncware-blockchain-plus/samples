#!/bin/sh

(cd bcplus; node tools/set_tables.mjs)
(cd hardhat; node tools/set_tables.mjs)
