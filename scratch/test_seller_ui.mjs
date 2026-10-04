import { chromium } from '/home/irshad-mohammad/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import path from 'path';

const SCREENSHOT_DIR = '/home/irshad-mohammad/.gemini/antigravity-ide/brain/af932643-0568-4aec-8786-94ea3db46e7d/scratch';
const SELLER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJpZCI6Miwicm9sZSI6InNlbGxlciIsImlzX2FkbWluIjpmYWxzZSwiZXhwIjoxNzkxNzIxMTkxfQ.Ed96jhk-43Z1tKypjjLA7slIbMyITkOQEycAGU4q8Pw';
const SELLER_USER = {
  id: 2,
  _id: '2',
  username: 'artisan.ramesh@craftnest.internal',
  name: 'Ramesh Artisan',
  email: 'artisan.ramesh@craftnest.internal',
  role: 'seller',
  is_admin: false
};

async function testSeller() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript((sellerData) => {
    localStorage.setItem('token', sellerData.token);
    localStorage.setItem('bb_token', sellerData.token);
    localStorage.setItem('user', JSON.stringify(sellerData.user));
    localStorage.setItem('bb_user', JSON.stringify(sellerData.user));
  }, { token: SELLER_TOKEN, user: SELLER_USER });

  await page.goto('http://localhost:5173/seller/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const sidebarText = await page.innerText('aside');
  const hasSupport = sidebarText.includes('Support');
  console.log('Seller sidebar contains Support:', hasSupport ? '❌ FAIL' : '✅ PASS (No Support tab in Seller sidebar)');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_seller_sidebar_no_support.png') });
  console.log('Saved 05_seller_sidebar_no_support.png');

  // Verify direct navigation to /owner/support is blocked
  await page.goto('http://localhost:5173/owner/support', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const supportHeading = await page.$('text=Customer Support Management');
  console.log('Seller cannot view Owner Support page:', (supportHeading === null) ? '✅ PASS (Access Denied / Not Rendered)' : '❌ FAIL');

  await browser.close();
}

testSeller().catch(err => {
  console.error(err);
  process.exit(1);
});
