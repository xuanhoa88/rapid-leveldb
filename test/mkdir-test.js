'use strict';

const test = require('tape');
const tempy = require('tempy');
const path = require('path');
const fs = require('fs');
const { LevelDB } = require('../src');

test('creates location directory recursively', async function (t) {
  const location = path.join(tempy.directory(), 'beep', 'boop');
  const db = new LevelDB(location);

  t.is(fs.existsSync(location), false);
  await db.open();
  t.is(fs.existsSync(location), true);
});

test('does not create location directory recursively if createIfMissing is false', async function (t) {
  const location = path.join(tempy.directory(), 'beep', 'boop');
  const db = new LevelDB(location, { createIfMissing: false });
  await db.open({ createIfMissing: false });
  t.notOk(fs.existsSync(location), 'directory does not exist after');
});
