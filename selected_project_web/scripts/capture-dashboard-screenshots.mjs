import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const outputDirectory = resolve('..', 'docs', 'images');
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve(outputDirectory, 'sales-dashboard.png'), fullPage: false });
  await page.getByLabel('選擇分析問題').selectOption('housing');
  await page.getByRole('heading', { name: '房價多元線性回歸互動分析' }).waitFor();
  await page.screenshot({ path: resolve(outputDirectory, 'housing-dashboard.png'), fullPage: false });
  console.log(`Dashboard screenshots written to ${outputDirectory}`);
} finally {
  await browser.close();
}
