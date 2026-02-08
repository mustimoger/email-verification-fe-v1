const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const sessionPath = path.join(__dirname, '.auth-session.json');
const raw = fs.readFileSync(sessionPath, 'utf8');
const { key, value } = JSON.parse(raw);

const baseUrl = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key, value });

  await page.goto(`${baseUrl}/verify`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'artifacts', 'verify.png'), fullPage: true });

  await page.goto(`${baseUrl}/overview`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const statusButton = page.getByRole('button', { name: /Processing|Completed|Unknown/i }).first();
  if (await statusButton.count()) {
    await statusButton.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: path.join(__dirname, 'artifacts', 'overview.png'), fullPage: true });

  await browser.close();
})();
