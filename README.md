# github-superclone

[![npm version](https://badge.fury.io/js/github-superclone.svg)](https://badge.fury.io/js/github-superclone)

## Overview

Clones or pulls most or all of the repositories of a GitHub user or set of GitHub organizations.
If authentication information is specified, private repositories are included.

## Installation

```sh
npm install -g github-superclone
```

## Usage

### Command-line

```
Usage: superclone [options]

Options:

  -V, --version              output the version number
  -o, --orgs <orgs>          GitHub organizations
  -u, --user <user>          GitHub user name
  -p, --password <password>  GitHub password or token
  -2, --2fa <code>           two-factor authentication code
  -d, --dir <dir>            target directory (default: .)
  -i, --ignore-forks         ignored forked repositories
  -a, --archived             include archived repositories
  -f, --force-pull           pull repositories regardless of local mtime
  -n, --dry-run              don't actually run git
  -h, --help                 output usage information
```

### API

This package can also be used as a library, which exports the following functions.

#### fetchRepos

Fetches all of the repositories for a given organization or user
and calls the given asynchronous callback for each one.

```typescript
function fetchRepos(
  kind: String, // 'org' or 'user'
  name: String,
  callback: function(repo, options): Promise<Void>,
  options: {
    user: String,
    password: String,
    otp: String,
    userAgent: String = path.basename(process.argv[1], '.js'),
    pageSize: Number = 100,
    hooks: {
      fetchingUrl: function(url: String): Void,
      fetchFailed: function(url: String, err: Error): Void
    } = {}
  } = {}
): Promise<Void>
```

#### cloneRepo

Clones or pulls the given repository.

```typescript
function cloneRepo(
  repo: {
    name: String, // required
    fork: Boolean = false,
    archived: Boolean = false,
    pushed_at: Date,
    clone_url: String // required
  },
  options: {
    dir: String = '.',
    gitCommand: String = 'git',
    ignoreForks: Boolean = false,
    ignoreArchived: Boolean = false,
    forcePull: Boolean = false,
    touchPull: Boolean = false,
    dryRun: Boolean = false,
    shellOptions = {},
    hooks: {
      ignoreFork: function(repo, dirExists: Boolean): Void,
      ignoreArchived: function(repo, dirExists: Boolean): Void,
      skipUpToDate: function(repo): Void,
      runningCommand: function(repo, cmd: String, cwd: String): Void,
      pullSucceeded: function(repo): Void,
      cloneSucceeded: function(repo): Void,
      cloneFailed: function(repo): Void
    } = {}
  } = {}
): Promise<Void>
```

#### shell

Executes the given command in a subshell and returns the accumulated stdout/stderr strings.
By default, stdout/stderr of the child process are piped to stdout/stderr of the parent process.
See [`child_process.spawn`](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options)
for the definition of `spawnOptions`.

```typescript
function shell(
  cmd: String,
  options: {
    spawnOptions = {},
    stdoutEncoding: String = 'utf8',
    stderrEncoding: String = 'utf8',
    stdoutWrite: function(s: String): Void = process.stdout.write.bind(process.stdout),
    stderrWrite: function(s: String): Void = process.stderr.write.bind(process.stderr)
  } = {}
): Promise<{
  stdout: String,
  stderr: String
}>
```

## FAQ

### Why would I want to do this?

You probably don't. I wanted to clone hundreds of repositories from an organization so I could perform static analysis.

### Hasn't this been done before?

You wouldn't believe how many times. This is my version. There are many like it, but this one is mine.

### Okay, so how is this one different?

If you insist, because it does/has all of these things:

- Supports an unlimited number of repositories (using GitHub pagination)
- Supports either a user or a set of organizations as repository owners
- Clones or pulls, depending on whether the directory exists
- Supports private repositories if authentication information is provided
- Optionally ignores forks
- Ignores archived repositories (or optionally includes them)
- Compares GitHub pushed-at time with local timestamp to avoid unnecessary pulls
- Optional dry-run mode to see what would be cloned
- Pretty colors and progress messages in the output
- Decent error handling
- CLI and library
- Readable modern JavaScript source code

### I'm having trouble authenticating -- what should I do?

Create a [personal access token](https://github.com/settings/tokens) with `repo` access
and use that instead of a password and two-factor.
If your organization uses Single Sign-on (SSO), be sure to click the little "SSO" button
next to your newly created token to authorize it for access.

## License

`github-superclone` is available under the [ISC license](LICENSE).
