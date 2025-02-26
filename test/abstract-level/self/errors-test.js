'use strict';

const test = require('tape');
const { AbortError } = require('../../../src/abstract-level/lib/errors');

test('AbortError', function (t) {
  const err = new AbortError();
  t.is(err.code, 'LEVEL_ABORTED');
  t.is(err.name, 'AbortError');
  t.end();
});
