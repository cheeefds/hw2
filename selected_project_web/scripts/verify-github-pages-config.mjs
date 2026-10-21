import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const configUrl = pathToFileURL(resolve('next.config.mjs')).href;

function readConfig(environment) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import config from ${JSON.stringify(configUrl)}; console.log(JSON.stringify(config));`,
    ],
    {
      env: {
        ...process.env,
        ...environment,
      },
      encoding: 'utf8',
    }
  );

  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

const localConfig = readConfig({
  GITHUB_ACTIONS: '',
  GITHUB_REPOSITORY: '',
});
assert.equal(localConfig.output, 'export');
assert.equal(localConfig.basePath, '');
assert.equal(localConfig.assetPrefix, '');
assert.equal(localConfig.env?.NEXT_PUBLIC_BASE_PATH, '');

const projectPagesConfig = readConfig({
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: 'cheeefds/hw2',
});
assert.equal(projectPagesConfig.output, 'export');
assert.equal(projectPagesConfig.basePath, '/hw2');
assert.equal(projectPagesConfig.assetPrefix, '/hw2');
assert.equal(projectPagesConfig.env?.NEXT_PUBLIC_BASE_PATH, '/hw2');

const userPagesConfig = readConfig({
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: 'cheeefds/cheeefds.github.io',
});
assert.equal(userPagesConfig.output, 'export');
assert.equal(userPagesConfig.basePath, '');
assert.equal(userPagesConfig.assetPrefix, '');
assert.equal(userPagesConfig.env?.NEXT_PUBLIC_BASE_PATH, '');

console.log('GitHub Pages next.config.mjs verification passed.');
