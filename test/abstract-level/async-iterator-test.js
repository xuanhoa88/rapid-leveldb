'use strict';

const input = [
  { key: '1', value: '1' },
  { key: '2', value: '2' },
];

let db;

exports.setup = function (test, testCommon) {
  test('async iterator setup', async function () {
    db = testCommon.factory();
    await db.open();
    return db.batch(input.map(entry => ({ ...entry, type: 'put' })));
  });
};

exports.asyncIterator = function (test, testCommon) {
  for (const mode of ['iterator', 'keys', 'values']) {
    test(`for await...of ${mode}()`, async function (t) {
      const it = db[mode]({ keyEncoding: 'utf8', valueEncoding: 'utf8' });
      const output = [];

      for await (const item of it) {
        output.push(item);
      }

      t.same(
        output,
        input.map(({ key, value }) => {
          return mode === 'iterator' ? [key, value] : mode === 'keys' ? key : value;
        })
      );
    });

    testCommon.supports.permanence &&
      test(`for await...of ${mode}() (deferred)`, async function (t) {
        const db = testCommon.factory();
        await db.batch(input.map(entry => ({ ...entry, type: 'put' })));
        await db.close();

        // Don't await
        db.open();

        const it = db[mode]({ keyEncoding: 'utf8', valueEncoding: 'utf8' });
        const output = [];

        for await (const item of it) {
          output.push(item);
        }

        t.same(
          output,
          input.map(({ key, value }) => {
            return mode === 'iterator' ? [key, value] : mode === 'keys' ? key : value;
          })
        );

        await db.close();
      });

    testCommon.supports.implicitSnapshots &&
      test(`for await...of ${mode}() (deferred, with snapshot)`, async function (t) {
        t.plan(2);

        const db = testCommon.factory();
        const it = db[mode]({ keyEncoding: 'utf8', valueEncoding: 'utf8' });
        const promise = db.batch(input.map(entry => ({ ...entry, type: 'put' })));
        const output = [];

        for await (const item of it) {
          output.push(item);
        }

        t.same(output, [], 'used snapshot');

        // Wait for data to be written
        await promise;

        for await (const item of db[mode]({ keyEncoding: 'utf8', valueEncoding: 'utf8' })) {
          output.push(item);
        }

        t.same(
          output,
          input.map(({ key, value }) => {
            return mode === 'iterator' ? [key, value] : mode === 'keys' ? key : value;
          })
        );

        await db.close();
      });

    for (const deferred of [false, true]) {
      test(`for await...of ${mode}() (empty, deferred: ${deferred})`, async function (t) {
        const db = testCommon.factory();
        const entries = [];

        if (!deferred) await db.open();

        for await (const item of db[mode]({ keyEncoding: 'utf8', valueEncoding: 'utf8' })) {
          entries.push(item);
        }

        t.same(entries, []);
        await db.close();
      });
    }

    test(`for await...of ${mode}() does not permit reuse`, async function (t) {
      t.plan(3);

      const it = db[mode]();

      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      for await (const item of it) {
        t.pass('nexted');
      }

      try {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        for await (const item of it) {
          t.fail('should not be called');
        }
      } catch (err) {
        t.is(err.code, 'LEVEL_ITERATOR_NOT_OPEN');
      }
    });
  }
};

exports.teardown = async function (test) {
  test('async iterator teardown', async function () {
    return db.close();
  });
};

exports.all = function (test, testCommon) {
  exports.setup(test, testCommon);
  exports.asyncIterator(test, testCommon);
  exports.teardown(test, testCommon);
};
