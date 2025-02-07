'use strict';

const test = require('tape');
const { promises: fsp, existsSync } = require('fs');
const { LevelDB } = require('../src');
const makeTest = require('./make');

test('test repair() without location throws', async function (t) {
  t.plan(2 * 2);

  for (const args of [[], ['']]) {
    try {
      await LevelDB.repair(...args);
    } catch (err) {
      t.is(err.name, 'TypeError');
      t.is(err.message, "The first argument 'location' must be a non-empty string");
    }
  }
});

test('test repair non-existent directory returns error', async function (t) {
  const location = '/1/2/3/4';
  await LevelDB.repair(location);
  t.notOk(existsSync(location), 'directory exists after');
});

// a proxy indicator that RepairDB is being called and doing its thing
makeTest('test repair() compacts', async function (db, t) {
  const { location } = db;

  await db.close();

  let files = await fsp.readdir(location);
  t.ok(
    files.some(function (f) {
      return /\.log$/.test(f);
    }),
    'directory contains log file(s)'
  );
  t.notOk(
    files.some(function (f) {
      return /\.ldb$/.test(f);
    }),
    'directory does not contain ldb file(s)'
  );

  await LevelDB.repair(location);

  files = await fsp.readdir(location);
  t.notOk(
    files.some(function (f) {
      return /\.log$/.test(f);
    }),
    'directory does not contain log file(s)'
  );
  t.ok(
    files.some(function (f) {
      return /\.ldb$/.test(f);
    }),
    'directory contains ldb file(s)'
  );
});
