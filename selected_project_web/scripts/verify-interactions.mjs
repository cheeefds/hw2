import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: edgePath, headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location();
      errors.push(`console: ${message.text()} — ${location.url || 'unknown URL'}:${location.lineNumber ?? 0}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()} — ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`response: ${response.status()} ${response.url()}`);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const selector = page.getByLabel('選擇分析問題');
  await assert.doesNotReject(() => selector.waitFor());
  assert.equal(await selector.inputValue(), 'sales');
  await assert.doesNotReject(() => page.getByRole('heading', { name: /零售需求/ }).first().waitFor());
  const salesInstructions = page.locator('pre').filter({ hasText: 'build_hw2_notebook.py' });
  assert.match(await salesInstructions.textContent(), /cd sales/, 'Sales reproduction commands must enter the moved sales directory');

  await selector.selectOption('housing');
  await assert.doesNotReject(() => page.getByRole('heading', { name: '房價多元線性回歸互動分析' }).waitFor());
  assert.equal(await page.locator('.housing-controls input[type="range"]').count(), 13);

  const prediction = page.getByTestId('housing-prediction');
  const initialPrediction = await prediction.textContent();
  const lstat = page.getByLabel(/低社經地位人口比例 LSTAT/);
  await lstat.fill(await lstat.getAttribute('max'));
  const changedPrediction = await prediction.textContent();
  assert.notEqual(changedPrediction, initialPrediction, 'Housing prediction should update after LSTAT changes');

  await selector.selectOption('sales');
  await assert.doesNotReject(() => page.getByRole('heading', { name: /零售需求/ }).first().waitFor());
  await selector.selectOption('housing');
  await assert.doesNotReject(() => page.getByTestId('housing-prediction').waitFor());
  assert.equal(await page.getByTestId('housing-prediction').textContent(), initialPrediction, 'Housing state should reset after unmounting');

  for (const image of await page.locator('img').all()) {
    assert.ok(await image.getAttribute('alt'), 'Every visible image must have alt text');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByLabel('選擇分析問題').selectOption('housing');
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(widths.scrollWidth <= widths.clientWidth + 1, `Mobile page overflows: ${JSON.stringify(widths)}`);
  assert.deepEqual(errors, []);

  console.log('Interactive browser verification passed for desktop and 390px mobile views.');
} finally {
  await browser.close();
}
