'use strict';

const test = require('tape');
const { AbstractLevel, AbstractIterator } = require('../../../src/abstract-level');
const {
  DeferredIterator,
  DeferredKeyIterator,
  DeferredValueIterator,
} = require('../../../src/abstract-level/lib/deferred-iterator');

function withIterator(methods) {
  class TestIterator extends AbstractIterator {}

  for (const k in methods) {
    TestIterator.prototype[k] = methods[k];
  }

  class Test extends AbstractLevel {
    _iterator(options) {
      return new TestIterator(this, options);
    }
  }

  return new Test({ encodings: { utf8: true } });
}

for (const mode of ['iterator', 'keys', 'values']) {
  for (const type of ['explicit', 'deferred']) {
    const verify = function (t, db, it) {
      t.is(db.status, type === 'explicit' ? 'open' : 'opening');

      if (type === 'explicit') {
        t.is(
          it.constructor.name,
          mode === 'iterator'
            ? 'TestIterator'
            : mode === 'keys'
              ? 'DefaultKeyIterator'
              : 'DefaultValueIterator'
        );
      } else {
        t.is(
          it.constructor,
          mode === 'iterator'
            ? DeferredIterator
            : mode === 'keys'
              ? DeferredKeyIterator
              : DeferredValueIterator
        );
      }
    };

    test(`for await...of ${mode}() (${type} open)`, async function (t) {
      t.plan(4);

      const input = [
        { key: '1', value: '1' },
        { key: '2', value: '2' },
      ];
      const output = [];

      const db = withIterator({
        async _next() {
          const entry = input[n++];
          return entry ? [entry.key, entry.value] : undefined;
        },

        async _close() {
          // Wait a tick
          await undefined;
          closed = true;
        },
      });

      if (type === 'explicit') await db.open();
      const it = db[mode]({ keyEncoding: 'utf8', valueEncoding: 'utf8' });
      verify(t, db, it);

      let n = 0;
      let closed = false;

      for await (const item of it) {
        output.push(item);
      }

      t.same(
        output,
        input.map(x => (mode === 'iterator' ? [x.key, x.value] : mode === 'keys' ? x.key : x.value))
      );
      t.ok(closed, 'closed');
    });

    test(`for await...of ${mode}() closes on user error (${type} open)`, async function (t) {
      t.plan(4);

      const db = withIterator({
        async _next() {
          if (n++ > 10) throw new Error('Infinite loop');
          return [n.toString(), n.toString()];
        },

        async _close() {
          // Wait a tick
          await undefined;
          closed = true;
          throw new Error('close error');
        },
      });

      if (type === 'explicit') await db.open();
      const it = db[mode]();
      verify(t, db, it);

      let n = 0;
      let closed = false;

      try {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        for await (const kv of it) {
          throw new Error('user error');
        }
      } catch (err) {
        t.is(err.message, 'user error');
        t.ok(closed, 'closed');
      }
    });

    test(`for await...of ${mode}() closes on iterator error (${type} open)`, async function (t) {
      t.plan(5);

      const db = withIterator({
        async _next() {
          t.pass('nexted');
          throw new Error('iterator error');
        },

        async _close() {
          // Wait a tick
          await undefined;
          closed = true;
        },
      });

      if (type === 'explicit') await db.open();
      const it = db[mode]();
      verify(t, db, it);

      let closed = false;

      try {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        for await (const kv of it) {
          t.fail('should not yield items');
        }
      } catch (err) {
        t.is(err.message, 'iterator error');
        t.ok(closed, 'closed');
      }
    });

    test(`for await...of ${mode}() combines errors (${type} open)`, async function (t) {
      t.plan(6);

      const db = withIterator({
        async _next() {
          t.pass('nexted');
          throw new Error('next error');
        },

        async _close() {
          closed = true;
          throw new Error('close error');
        },
      });

      if (type === 'explicit') await db.open();
      const it = db[mode]();
      verify(t, db, it);

      let closed = false;

      try {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        for await (const kv of it) {
          t.fail('should not yield items');
        }
      } catch (err) {
        t.is(err.name, 'CombinedError');
        t.is(err.message, 'next error; close error');
        t.ok(closed, 'closed');
      }
    });

    test(`for await...of ${mode}() closes on user break (${type} open)`, async function (t) {
      t.plan(4);

      const db = withIterator({
        async _next() {
          if (n++ > 10) throw new Error('Infinite loop');
          return [n.toString(), n.toString()];
        },

        async _close() {
          // Wait a tick
          await undefined;
          closed = true;
        },
      });

      if (type === 'explicit') await db.open();
      const it = db[mode]();
      verify(t, db, it);

      let n = 0;
      let closed = false;

      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      for await (const kv of it) {
        t.pass('got a chance to break');
        break;
      }

      t.ok(closed, 'closed');
    });

    test(`for await...of ${mode}() closes on user return (${type} open)`, async function (t) {
      t.plan(4);

      const db = withIterator({
        async _next() {
          if (n++ > 10) throw new Error('Infinite loop');
          return [n.toString(), n.toString()];
        },

        async _close() {
          // Wait a tick
          await undefined;
          closed = true;
        },
      });

      if (type === 'explicit') await db.open();
      const it = db[mode]();
      verify(t, db, it);

      let n = 0;
      let closed = false;

      await (async () => {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        for await (const kv of it) {
          t.pass('got a chance to return');
          return;
        }
      })();

      t.ok(closed, 'closed');
    });
  }
}
