#!/usr/bin/env node

const chalk = require('chalk');
const opts = require('commander');
const fs = require('fs');
const path = require('path');

const package = require('./package.json');
const { cloneRepo } = require('./src/cloneRepo');
const { fetchRepos } = require('./src/fetchRepos');

function collect(val, arr) {
  return (arr || []).concat(val.split(','));
}

opts
  .version(package.version)
  .option('-o, --orgs <orgs>', 'GitHub organizations', collect)
  .option('-u, --user <user>', 'GitHub user name')
  .option('-s, --subdirs', 'Clone into org/user name subdirectories')
  .option('-p, --password <password>', 'GitHub password/token')
  .option('-2, --2fa <code>', 'two-factor authentication code')
  .option('-d, --dir <dir>', 'target directory', '.')
  .option('-i, --ignore-forks', 'ignored forked repositories')
  .option('-a, --archived', 'include archived repositories')
  .option('-f, --force-pull', 'pull repositories regardless of local mtime')
  .option('-n, --dry-run', 'don\'t actually run git')
  .parse(process.argv);
if (!opts.user && (!opts.orgs || opts.orgs.length === 0)) {
  console.log('--orgs or --user required');
  opts.help();
}

const commandStyle = chalk.yellowBright;
const noteStyle = chalk.bold.blueBright;
const noteEmphasisStyle = chalk.bold.cyanBright;
const errorStyle = chalk.bold.redBright;
const summaryStyle = chalk.magentaBright;
const stdoutStyle = chalk.reset;
const stderrStyle = chalk.red;

async function main() {
  const stats = {
    clonedCount: 0,
    pulledCount: 0,
    upToDateCount: 0,
    skippedCount: 0,
    staleRepos: [],
    errorCount: 0,
    errorRepos: []
  };
  const fetchOptions = {
    ...opts,
    otp: opts['2fa'],
    hooks: {
      fetchingUrl(url) {
        console.log(`Fetching ${url}`);
      },
      fetchFailed(_url, err) {
        console.error(errorStyle(`${err.statusCode}: ${err.error.message}`));
        ++stats.errorCount;
      }
    }
  };
  const cloneOptions = {
    ...opts,
    ignoreArchived: !opts.archived,
    touchPull: true,
    shellOptions: {
      stdoutWrite: s => process.stdout.write(stdoutStyle(s)),
      stderrWrite: s => process.stderr.write(stderrStyle(s))
    },
    hooks: {
      ignoreFork({ name, full_name }, dirExists) {
        const existsMessage = dirExists ? noteEmphasisStyle(' (but it exists locally)') : '';
        console.log(noteStyle(`Ignoring fork ${name}` + existsMessage));
        ++stats.skippedCount;
        if (dirExists) stats.staleRepos.push(full_name);
      },
      ignoreArchived({ name, full_name }, dirExists) {
        const existsMessage = dirExists ? noteEmphasisStyle(' (but it exists locally)') : '';
        console.log(noteStyle(`Ignoring archived repository ${name}` + existsMessage));
        ++stats.skippedCount;
        if (dirExists) stats.staleRepos.push(full_name);
      },
      skipUpToDate({ name }) {
        console.log(noteStyle(`Repository ${name} is already up-to-date`));
        ++stats.upToDateCount;
      },
      runningCommand(_repo, cmd, cwd) {
        console.log(commandStyle(`${cwd}: ${cmd}`));
      },
      pullSucceeded() {
        ++stats.pulledCount;
      },
      cloneSucceeded() {
        ++stats.clonedCount;
      },
      cloneFailed({ name, full_name }, err) {
        console.error(errorStyle(`${name}: ${err.message}`));
        ++stats.errorCount;
        stats.errorRepos.push(full_name);
      }
    }
  };
  if (chalk.supportsColor) {
    cloneOptions.gitCommand = 'git -c color.ui=always';
  }
  if (opts.orgs) {
    console.log(summaryStyle(`Cloning from organizations: ${opts.orgs.join(', ')}`));
    for (const org of opts.orgs) {
      if (opts.subdirs) {
        cloneOptions.dir = ensureDir(path.join(opts.dir, org));
      }
      const repoNames = new Set();
      await fetchRepos('org', org, repo => {
        repoNames.add(repo.name);
        return cloneRepo(repo, cloneOptions);
      }, fetchOptions);
      showExtraRepos(cloneOptions.dir, repoNames);
    }
  } else {
    console.log(summaryStyle(`Cloning from user ${opts.user}`));
    if (opts.subdirs) {
      cloneOptions.dir = ensureDir(path.join(opts.dir, opts.user));
    }
    const repoNames = new Set();
    await fetchRepos('user', opts.user, repo => {
      repoNames.add(repo.name);
      return cloneRepo(repo, cloneOptions);
    }, fetchOptions);
    showExtraRepos(cloneOptions.dir, repoNames);
  }
  console.log(summaryStyle(`${stats.clonedCount} cloned, ${stats.pulledCount} pulled` +
    `, ${stats.upToDateCount} already up-to-date, ${stats.skippedCount} skipped, ${stats.errorCount} errors`));
  if (stats.staleRepos.length > 0) {
    stats.staleRepos.sort();
    console.log(noteEmphasisStyle(`Skipped local repositories: ${stats.staleRepos.join(' ')}`));
  }
  if (stats.errorRepos.length > 0) {
    stats.errorRepos.sort();
    console.log(errorStyle(`Failing repositories: ${stats.errorRepos.join(' ')}`));
  }
  process.stdin.end();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
}

function showExtraRepos(dir, repoNames) {
  const extraRepos = getSubdirs(dir).filter(name => !repoNames.has(name) && isGitRepo(path.join(dir, name)));
  if (extraRepos.length > 0) {
    extraRepos.sort();
    console.log(noteEmphasisStyle(`Additional repositories: ${extraRepos.join(' ')}`));
  }
}

function getSubdirs(dir) {
  const dirents = fs.readdirSync(dir).map(name => {
    const stats = fs.statSync(path.join(dir, name));
    stats.name = name;
    return stats;
  });
  return dirents.filter(d => d.isDirectory()).map(d => d.name);
}

function isGitRepo(dir) {
  try {
    const stats = fs.statSync(path.join(dir, '.git'));
    return stats.isDirectory();
  } catch (e) {
    return false;
  }
}

main().catch(e => console.error(e));
