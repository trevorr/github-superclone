#!/usr/bin/env node

const chalk = require('chalk');
const child_process = require('child_process');
const fs = require('fs');
const opts = require('commander');
const parseLinkHeader = require('parse-link-header');
const path = require('path');
const request = require('request-promise-native');

const package = require('./package.json');

function collect(val, arr) {
  return (arr || []).concat(val.split(','));
}

opts
  .version(package.version)
  .option('-o, --orgs <orgs>', 'GitHub organizations', collect)
  .option('-u, --user <user>', 'GitHub user name')
  .option('-p, --password <password>', 'GitHub password/token')
  .option('-2, --2fa <code>', 'two-factor authentication code')
  .option('-d, --dir <dir>', 'target directory', '.')
  .option('-i, --ignore-forks', 'ignored forked repositories')
  .option('-a, --archived', 'include archived repositories')
  .option('-n, --dry-run', 'don\'t actually run git')
  .parse(process.argv);
if (!opts.user && (!opts.orgs || opts.orgs.length === 0)) {
  console.log('--orgs or --user required');
  opts.help();
}

const baseUrl = 'https://api.github.com';
let gitCommand = 'git';
if (chalk.supportsColor) {
  gitCommand += ' -c color.ui=always';
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
    skippedCount: 0,
    staleRepos: [],
    errorCount: 0,
    errorRepos: []
  };
  if (opts.orgs) {
    console.log(summaryStyle(`Cloning from organizations: ${opts.orgs.join(', ')}`));
    for (const org of opts.orgs) {
      await fetchRepos('org', org, stats);
    }
  } else {
    console.log(summaryStyle(`Cloning from user ${opts.user}`));
    await fetchRepos('user', opts.user, stats);
  }
  console.log(summaryStyle(`${stats.clonedCount} cloned, ${stats.pulledCount} pulled` +
    `, ${stats.skippedCount} skipped, ${stats.errorCount} errors`));
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

async function fetchRepos(kind, name, stats) {
  let nextUrl = `${baseUrl}/${kind}s/${name}/repos`;
  while (nextUrl) {
    console.log(`Fetching ${nextUrl}`);
    const options = {
      qs: {
        per_page: 100
      },
      headers: {
        'User-Agent': path.basename(process.argv[1], '.js')
      },
      json: true,
      resolveWithFullResponse: true
    };
    if (opts.user || opts.password) {
      options.auth = {};
      if (opts.user) {
        options.auth.user = opts.user;
      }
      if (opts.password) {
        options.auth.pass = opts.password;
      }
    }
    if (opts['2fa']) {
      options.headers['X-GitHub-OTP'] = opts['2fa'];
    }
    let res;
    try {
      res = await request(nextUrl, options);
    } catch (e) {
      console.error(errorStyle(`${e.statusCode}: ${e.error.message}`));
      ++stats.errorCount;
      break;
    }
     for (const repo of res.body) {
      await cloneRepo(repo, stats);
    }
    const linkHeader = res.headers.link;
    const links = parseLinkHeader(linkHeader);
    nextUrl = links && links.next && links.next.url;
  }
}

async function cloneRepo(repo, stats) {
  const { name, fork, archived, clone_url } = repo;

  const rootDir = opts.dir || '.';
  const dir = path.join(rootDir, name);
  const dirExists = fs.existsSync(dir);

  const existsMessage = dirExists ? noteEmphasisStyle(' (but it exists locally)') : '';
  if (fork && opts.ignoreForks) {
    console.log(noteStyle(`Ignoring fork ${name}` + existsMessage));
    ++stats.skippedCount;
    if (dirExists) stats.staleRepos.push(name);
    return;
  }
  if (archived && !opts.archived) {
    console.log(noteStyle(`Ignoring archived repository ${name}` + existsMessage));
    ++stats.skippedCount;
    if (dirExists) stats.staleRepos.push(name);
    return;
  }

  let cmd, cwd;
  if (dirExists) {
    cmd = `${gitCommand} pull --progress`;
    cwd = dir;
  } else {
    cmd = `${gitCommand} clone --progress ${clone_url}`;
    cwd = rootDir;
  }
  try {
    console.log(commandStyle(`${cwd}: ${cmd}`));
    if (!opts.dryRun) {
      await shell(cmd, { cwd });
    }
    if (dirExists) {
      ++stats.pulledCount;
    } else {
      ++stats.clonedCount;
    }
  } catch (e) {
    console.error(errorStyle(`${name}: ${e.message}`));
    ++stats.errorCount;
    stats.errorRepos.push(name);
  }
}

function shell(cmd, options = {}) {
  return new Promise(function (resolve, reject) {
    const cp = child_process.spawn(cmd, { ...options, shell: true });
    let stdout = '';
    let stderr = '';
    process.stdin.pipe(cp.stdin);
    cp.stdout.setEncoding('utf8');
    cp.stdout.on('data', data => {
      stdout += data;
      process.stdout.write(stdoutStyle(data));
    });
    cp.stderr.setEncoding('utf8');
    cp.stderr.on('data', data => {
      stderr += data;
      process.stderr.write(stderrStyle(data));
    });
    cp.on('error', err => {
      reject(err);
    });
    cp.on('close', (code, signal) => {
      if (code === 0) {
        resolve({
          stdout,
          stderr
        });
      } else {
        const message = (code != null) ?
          `Process exited with code ${code}` :
          `Process terminated by signal ${signal}`;
        const err = new Error(message);
        Object.assign(err, {
          code,
          signal,
          stdout,
          stderr
        });
        reject(err);
      }
    });
  });
}

main().catch(e => console.error(e));
