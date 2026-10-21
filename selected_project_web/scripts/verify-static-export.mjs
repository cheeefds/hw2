import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve('out');
const indexPath = resolve(outputDirectory, 'index.html');
const [repositoryOwner = '', repositoryName = ''] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true' && repositoryName.length > 0;
const isUserOrOrganizationSite = repositoryName.toLowerCase() === `${repositoryOwner}.github.io`.toLowerCase();
const expectedPrefix = isGitHubPagesBuild && !isUserOrOrganizationSite ? `/${repositoryName}` : '';

assert.ok(existsSync(indexPath), `Expected export artifact at ${indexPath}`);

const html = readFileSync(indexPath, 'utf8');
const chunksDirectory = resolve(outputDirectory, '_next', 'static', 'chunks');
const chunkText = existsSync(chunksDirectory)
  ? readdirSync(chunksDirectory, { recursive: true })
      .filter((entry) => String(entry).endsWith('.js'))
      .map((entry) => readFileSync(resolve(chunksDirectory, String(entry)), 'utf8'))
      .join('\n')
  : '';
const exportedText = `${html}\n${chunkText}`;

assert.ok(exportedText.includes('Sales：零售需求預測'), 'Export should contain the Sales problem option');
assert.ok(exportedText.includes('Housing：房價預測'), 'Export should contain the Housing problem option');
assert.ok(exportedText.includes('選擇分析問題'), 'Export should contain an accessible problem selector label');

for (const problem of ['sales', 'housing']) {
  for (const imageName of [
    'actual_vs_predicted.png',
    'prediction_interval.png',
    'residual_diagnostics.png',
  ]) {
    const imagePath = resolve(outputDirectory, 'images', problem, imageName);
    assert.ok(existsSync(imagePath), `Expected ${problem} image at ${imagePath}`);
  }
}

if (expectedPrefix) {
  assert.ok(
    html.includes(`${expectedPrefix}/_next/`) || html.includes(`${expectedPrefix}/images/`),
    `Index HTML should use GitHub Pages base prefix "${expectedPrefix}"`
  );
}

console.log('Static export verification passed.');
