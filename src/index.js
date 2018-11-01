'use strict';

const { cloneRepo } = require('./cloneRepo');
const { fetchRepos } = require('./fetchRepos');
const { shell } = require('./shell');

module.exports = {
  fetchRepos,
  cloneRepo,
  shell
};
