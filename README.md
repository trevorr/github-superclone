# github-superclone

## Overview

Clones or pulls most or all of the repositories of a GitHub user or set of GitHub organizations.
If authentication information is specified, private repositories are included.

## Installation

```sh
npm install -g github-superclone
```

## Usage

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
  -n, --dry-run              don't actually run git
  -h, --help                 output usage information
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
- Optional dry-run mode to see what would be cloned
- Pretty colors and progress messages in the output
- Decent error handling
- Readable modern JavaScript source code

### I'm having trouble authenticating -- what should I do?

Create a [personal access token](https://github.com/settings/tokens) with `repo` access
and use that instead of a password and two-factor.
If your organization uses Single Sign-on (SSO), be sure to click the little "SSO" button
next to your newly created token to authorize it for access.
