'use strict';

const test = require('tape');
const tempy = require('tempy');
const { LevelDB } = require('../src');
const { common } = require('./abstract-level');

module.exports = common({
  test,
  factory(options) {
    return new LevelDB(tempy.directory(), options);
  },
});
