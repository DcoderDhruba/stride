const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.setContent('<style>body{margin:0;background:#C7B8FA;display:grid;place-items:center;width:1024px;height:1024px}</style><svg width="650" height="650" viewBox="0 0 100 100"><path d="M8 52h19l11-27 19 50 13-30 7 7h15" fill="none" stroke="#262823" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  await page.screenshot({ path: 'assets/stride-icon.png' });
  await browser.close();
})();
