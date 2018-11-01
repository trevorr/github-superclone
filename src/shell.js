'use strict';

const child_process = require('child_process');

function shell(cmd, options = {}) {
  const {
    spawnOptions = {},
    stdoutEncoding = 'utf8',
    stderrEncoding = 'utf8',
    stdoutWrite = process.stdout.write.bind(process.stdout),
    stderrWrite = process.stderr.write.bind(process.stderr)
  } = options;
  return new Promise(function (resolve, reject) {
    const cp = child_process.spawn(cmd, { ...spawnOptions, shell: true });
    let stdout = '';
    let stderr = '';
    process.stdin.pipe(cp.stdin);
    cp.stdout.setEncoding(stdoutEncoding);
    cp.stdout.on('data', data => {
      stdout += data;
      if (stdoutWrite) {
        stdoutWrite(data);
      }
    });
    cp.stderr.setEncoding(stderrEncoding);
    cp.stderr.on('data', data => {
      stderr += data;
      if (stderrWrite) {
        stderrWrite(data);
      }
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

module.exports = {
  shell
};
