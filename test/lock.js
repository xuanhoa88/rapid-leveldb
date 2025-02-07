'use strict';

const { LevelDB } = require('../src');

const location = process.argv[2];
const db = new LevelDB(location);

db.open().then(
  function () {
    process.send(null);
  },
  function (err) {
    process.send(err);
  }
);
