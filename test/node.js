'use strict';

const tape = require('tape');
const path = require('path');
const glob = require('glob');

process.on('uncaughtException', function (err) {
  console.error(err);
  process.exit(1);
});

tape.onFinish(() => process.exit());
tape.onFailure(() => process.exit(1));

for (const file of glob.sync('test/**/*-test.js')) {
  require(path.resolve('.', file));
}
