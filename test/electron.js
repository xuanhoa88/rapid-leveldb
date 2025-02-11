'use strict';

const tape = require('tape');
const { app } = require('electron');
const path = require('path');
const glob = require('glob');

process.on('uncaughtException', function (err) {
  console.error(err);
  app.exit(1);
});

app.on('ready', function () {
  tape.onFinish(() => app.quit());
  tape.onFailure(() => app.exit(1));

  for (const file of glob.sync('test/**/*-test.js')) {
    require(path.resolve('.', file));
  }
});
