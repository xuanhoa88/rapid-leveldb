'use strict';

/**
 * This test uses infinite recursion to test iterator creation with limited
 * stack space. In order to isolate the test harness, we run in a different
 * process. This is achieved through a fork() command in
 * iterator-recursion-test.js. To prevent tape from trying to run this test
 * directly, we check for a command-line argument.
 */
const testCommon = require('./common');

if (process.argv[2] === 'run') {
  const db = testCommon.factory();
  let depth = 0;

  db.open().then(function () {
    // Escape promise chain
    process.nextTick(function () {
      function recurse() {
        db.iterator({ gte: '0' });
        depth++;
        recurse();
      }

      try {
        recurse();
      } catch (e) {
        process.send('Catchable error at depth ' + depth);
      }
    });
  });
}
