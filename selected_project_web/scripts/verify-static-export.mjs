import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve('out');
const indexPath = resolve(outputDirectory, 'index.html');
const [repositoryOwner = '', repositoryName = ''] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true' && repositoryName.length > 0;
const isUserOrOrganizationSite = repositoryName.toLowerCase() === `${repositoryOwner}.github.io`.toLowerCase();
const expectedPrefix = isGitHubPagesBuild && !isUserOrOrganizationSite ? `/${repositoryName}` : '';

assert.ok(existsSync(indexPath), `Expected export artifact at ${indexPath}`);

const html = readFileSync(indexPath, 'utf8');

assert.ok(html.includes('7115056075 HW2') || html.includes('零售需求'), 'Index HTML should contain project title');

if (expectedPrefix) {
  assert.ok(
    html.includes(`${expectedPrefix}/_next/`) || html.includes(`${expectedPrefix}/images/`),
    `Index HTML should use GitHub Pages base prefix "${expectedPrefix}"`
  );
}

console.log('Static export verification passed.');
