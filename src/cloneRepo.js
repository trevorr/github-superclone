'use strict';

const fs = require('fs');
const path = require('path');
const { shell } = require('./shell');

async function cloneRepo(repo, options = {}) {
  const {
    name, // required
    fork = false,
    archived = false,
    pushed_at,
    clone_url // required
  } = repo;
  const {
    dir: rootDir = '.',
    gitCommand = 'git',
    user,
    password,
    ignoreForks = false,
    ignoreArchived = false,
    forcePull = false,
    touchPull = false,
    dryRun = false,
    shellOptions = {},
    hooks = {}
  } = options;

  const dir = path.join(rootDir, name);
  const dirExists = fs.existsSync(dir);

  if (fork && ignoreForks) {
    if (hooks.ignoreFork) hooks.ignoreFork(repo, dirExists);
    return;
  }
  if (archived && ignoreArchived) {
    if (hooks.ignoreArchived) hooks.ignoreArchived(repo, dirExists);
    return;
  }

  let cmd, cwd;
  if (dirExists) {
    const dirStat = fs.statSync(dir);
    if (pushed_at && dirStat.mtime >= new Date(pushed_at) && !forcePull) {
      if (hooks.skipUpToDate) hooks.skipUpToDate(repo);
      return;
    }

    cmd = `${gitCommand} pull --progress`;
    cwd = dir;
  } else {
    let url = clone_url;
    if (user) {
      const auth = password ? `${user}:${password}` : user;
      url = url.replace(/:\/\//, `://${auth}@`);
    }
    cmd = `${gitCommand} clone --progress ${url}`;
    cwd = rootDir;
  }
  try {
    if (hooks.runningCommand) hooks.runningCommand(repo, cmd, cwd);
    const now = new Date();
    if (!dryRun) {
      await shell(cmd, {
        ...shellOptions,
        spawnOptions: { cwd }
      });
    }
    if (dirExists) {
      if (hooks.pullSucceeded) hooks.pullSucceeded(repo);
      if (touchPull) {
        fs.utimesSync(dir, now, now);
      }
    } else {
      if (hooks.cloneSucceeded) hooks.cloneSucceeded(repo);
    }
  } catch (e) {
    if (hooks.cloneFailed) hooks.cloneFailed(repo, e);
  }
}

module.exports = {
  cloneRepo
};
