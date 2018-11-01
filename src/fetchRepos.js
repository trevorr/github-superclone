'use strict';

const parseLinkHeader = require('parse-link-header');
const path = require('path');
const request = require('request-promise-native');

const baseUrl = 'https://api.github.com';

async function fetchRepos(kind, name, callback, options = {}) {
  const {
    user,
    password,
    otp,
    userAgent = path.basename(process.argv[1], '.js'),
    pageSize = 100,
    hooks = {}
  } = options;

  let nextUrl = `${baseUrl}/${kind}s/${name}/repos`;
  while (nextUrl) {
    if (hooks.fetchingUrl) hooks.fetchingUrl(nextUrl);
    const requestOptions = {
      qs: {
        per_page: pageSize
      },
      headers: {
        'User-Agent': userAgent
      },
      json: true,
      resolveWithFullResponse: true
    };
    if (user || password) {
      requestOptions.auth = {};
      if (user) {
        requestOptions.auth.user = user;
      }
      if (password) {
        requestOptions.auth.pass = password;
      }
    }
    if (otp) {
      requestOptions.headers['X-GitHub-OTP'] = otp;
    }
    let res;
    try {
      res = await request(nextUrl, requestOptions);
    } catch (e) {
      if (hooks.fetchFailed) hooks.fetchFailed(url, e);
      break;
    }
     for (const repo of res.body) {
      await callback(repo, options);
    }
    const linkHeader = res.headers.link;
    const links = parseLinkHeader(linkHeader);
    nextUrl = links && links.next && links.next.url;
  }
}

module.exports = {
  fetchRepos
};
