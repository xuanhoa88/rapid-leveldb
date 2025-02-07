'use strict';

const du = require('du');
const test = require('tape');
const testCommon = require('./common');
const { LevelDB } = require('../src');

const compressableData = Buffer.from(
  Array.apply(null, Array(1024 * 100))
    .map(() => 'aaaaaaaaaa')
    .join('')
);

const multiples = 10;
const dataSize = compressableData.length * multiples;

const verify = function (location, compression, t) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Delay to allow filesystem updates
      du(location, async (err, size) => {
        await LevelDB.destroy(location);

        if (err) return reject(err);
        if (compression) {
          const ratio = 1.005; // Allow small variation (0.5%)
          t.ok(size < dataSize * ratio, `Expected size < ${dataSize * ratio}, got ${size}`);
        } else {
          t.ok(size >= dataSize, `Expected size >= ${dataSize}, got ${size}`);
        }

        resolve();
      });
    }, 100); // Small delay before checking disk usage
  });
};

// Close, reopen, close again to trigger compaction
const cycle = async function (db, compression) {
  const { location } = db;
  await db.close();

  db = new LevelDB(location);
  await db.open({ errorIfExists: false, compression });

  console.log('LevelDB version:', db.getProperty('leveldb.stats'));

  await db.close();

  return location;
};

test('compression', function (t) {
  t.plan(4);

  t.test('data is compressed by default (db.put())', async function (t) {
    let db = testCommon.factory();
    await db.open({ compression: true }); // Explicitly set compression
    await Promise.all(
      Array.from({ length: multiples }, (_, i) => db.put(String(i), compressableData))
    );

    await verify(await cycle(db, true), true, t);
  });

  t.test('data is not compressed with compression=false on open() (db.put())', async function (t) {
    const db = testCommon.factory();
    await db.open({ compression: false }); // Explicitly disable compression
    await Promise.all(
      Array.from({ length: multiples }, (_, i) => db.put(String(i), compressableData))
    );

    await verify(await cycle(db, false), false, t);
  });

  t.test('data is compressed by default (db.batch())', async function (t) {
    const db = testCommon.factory();
    await db.open({ compression: true }); // Explicitly set compression
    await db.batch(
      Array.from({ length: multiples }, (_, i) => ({
        type: 'put',
        key: String(i),
        value: compressableData,
      }))
    );

    await verify(await cycle(db, true), true, t);
  });

  t.test(
    'data is not compressed with compression=false on factory (db.batch())',
    async function (t) {
      const db = testCommon.factory();
      await db.open({ compression: false }); // Explicitly disable compression
      await db.batch(
        Array.from({ length: multiples }, (_, i) => ({
          type: 'put',
          key: String(i),
          value: compressableData,
        }))
      );

      await verify(await cycle(db, false), false, t);
    }
  );
});
