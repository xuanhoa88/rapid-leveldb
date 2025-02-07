'use strict';

const test = require('tape');
const { LevelDB } = require('../src');

test('test database creation non-string location throws', function (t) {
  t.throws(() => new LevelDB({}), {
    name: 'TypeError',
    message: "The first argument 'location' must be a non-empty string",
  });
  t.throws(() => new LevelDB(''), {
    name: 'TypeError',
    message: "The first argument 'location' must be a non-empty string",
  });
  t.end();
});
