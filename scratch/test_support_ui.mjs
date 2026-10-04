import { chromium } from '/home/irshad-mohammad/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/home/irshad-mohammad/.gemini/antigravity-ide/brain/af932643-0568-4aec-8786-94ea3db46e7d/scratch';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const OWNER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpZCI6MSwicm9sZSI6Im93bmVyIiwiaXNfYWRtaW4iOnRydWUsImV4cCI6MTc5MTcyMTE5MX0.-c7o8gidhjfp4lKcsOZcEswkVfaK-qcmz3I9Vrk0IPM';
const SELLER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJpZCI6Miwicm9sZSI6InNlbGxlciIsImlzX2FkbWluIjpmYWxzZSwiZXhwIjoxNzkxNzIxMTkxfQ.Ed96jhk-43Z1tKypjjLA7slIbMyITkOQEycAGU4q8Pw';

const OWNER_USER = {
  id: 1,
  _id: '1',
  username: 'owner@craftnest.internal',
  name: 'CraftNest Owner',
  email: 'owner@craftnest.internal',
  role: 'owner',
  is_admin: true
};

const SELLER_USER = {
  id: 2,
  _id: '2',
  username: 'artisan.ramesh@craftnest.internal',
  name: 'Ramesh Artisan',
  email: 'artisan.ramesh@craftnest.internal',
  role: 'seller',
  is_admin: false
};

async function runBrowserTests() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('=== STARTING BROWSER E2E TESTS FOR SUPPORT SYSTEM ===\n');

  // -------------------------------------------------------------------------
  // TEST 1: Customer visits /contact and submits a Support Ticket
  // -------------------------------------------------------------------------
  console.log('[TEST 1] Testing Customer Contact / Support Form...');
  await page.goto('http://localhost:5173/contact', { waitUntil: 'networkidle' });

  // Verify form fields
  await page.fill('input[placeholder="Your full name"]', 'Ananya Deshmukh');
  await page.fill('input[placeholder="aarav@example.com"]', 'ananya.crafts@gmail.com');
  await page.selectOption('select', 'Product Issue');
  await page.fill('input[placeholder="e.g. ORD-1024 or 123"]', 'ORD-5521');
  await page.fill('input[placeholder="Brief summary of your query or issue"]', 'Terracotta Vase arrived chipped at rim');
  await page.fill('textarea', 'Greetings CraftNest team, my handpainted blue pottery vase arrived this afternoon but the rim has a visible chip. Please let me know how I can get an exchange or replacement.');

  // Submit
  await page.click('button:has-text("Submit Support Ticket")');
  await page.waitForSelector('text=Support Ticket Created', { timeout: 10000 });

  const ticketIdEl = await page.$('text=TKT-');
  const ticketIdText = ticketIdEl ? await ticketIdEl.innerText() : 'Found';
  console.log(`  ✓ Support Ticket Created: ${ticketIdText}`);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_customer_ticket_created.png') });
  console.log('  ✓ Screenshot saved: 01_customer_ticket_created.png');

  // -------------------------------------------------------------------------
  // TEST 2: Owner logs in and checks Sidebar for Support Tab & Notification Badge
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Verifying Owner Dashboard Sidebar & Support Menu Item...');
  await page.addInitScript((ownerData) => {
    localStorage.setItem('token', ownerData.token);
    localStorage.setItem('bb_token', ownerData.token);
    localStorage.setItem('user', JSON.stringify(ownerData.user));
    localStorage.setItem('bb_user', JSON.stringify(ownerData.user));
  }, { token: OWNER_TOKEN, user: OWNER_USER });

  await page.goto('http://localhost:5173/owner/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check Stakeholders section contains Customers, Sellers / Artisans, Sub Owners, Support
  const sidebarText = await page.innerText('aside');
  const hasStakeholders = sidebarText.includes('STAKEHOLDERS');
  const hasCustomers = sidebarText.includes('Customers');
  const hasSellers = sidebarText.includes('Sellers / Artisans');
  const hasSubOwners = sidebarText.includes('Sub Owners');
  const hasSupport = sidebarText.includes('Support');

  console.log('  Stakeholders section present:', hasStakeholders ? '✅ PASS' : '❌ FAIL');
  console.log('  Customers item present:', hasCustomers ? '✅ PASS' : '❌ FAIL');
  console.log('  Sellers item present:', hasSellers ? '✅ PASS' : '❌ FAIL');
  console.log('  Sub Owners item present:', hasSubOwners ? '✅ PASS' : '❌ FAIL');
  console.log('  Support item present in Owner sidebar:', hasSupport ? '✅ PASS' : '❌ FAIL');

  // Check Support link order
  const supportLink = await page.$('a[href="/owner/support"]');
  console.log('  Support tab link element found:', supportLink !== null ? '✅ PASS' : '❌ FAIL');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_owner_sidebar_support_tab.png') });
  console.log('  ✓ Screenshot saved: 02_owner_sidebar_support_tab.png');

  // -------------------------------------------------------------------------
  // TEST 3: Navigate to Owner Support Inbox
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Navigating to Owner Support Inbox (/owner/support)...');
  await page.goto('http://localhost:5173/owner/support', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Customer Support Management', { timeout: 10000 });

  // Verify Metrics and search
  const totalInquiries = await page.$('text=Total Inquiries');
  const openPending = await page.$('text=Open / Pending');
  const searchInput = await page.$('input[placeholder*="Search by Ticket ID"]');

  console.log('  Metric cards rendered:', (totalInquiries && openPending) ? '✅ PASS' : '❌ FAIL');
  console.log('  Search & Filter bar rendered:', searchInput !== null ? '✅ PASS' : '❌ FAIL');

  // Check tickets table
  const ticketRow = await page.$('text=Terracotta Vase arrived chipped at rim');
  console.log('  Newly submitted customer ticket visible in Inbox:', ticketRow !== null ? '✅ PASS' : '❌ FAIL');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_owner_support_inbox.png') });
  console.log('  ✓ Screenshot saved: 03_owner_support_inbox.png');

  // -------------------------------------------------------------------------
  // TEST 4: Open Ticket Conversation & Send Reply
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] Opening ticket detail drawer and writing reply...');
  if (ticketRow) {
    await ticketRow.click();
  } else {
    const viewButton = await page.$('button:has-text("View & Reply")');
    if (viewButton) await viewButton.click();
  }

  await page.waitForSelector('text=Customer Original Query', { timeout: 8000 });
  console.log('  ✓ Conversation Drawer opened successfully');

  // Write a reply
  await page.fill('textarea[placeholder*="Type your official response"]', 'Namaste Ananya ji, we deeply apologize for the transit damage. We have initiated a replacement blue pottery vase from our Jaipur artisan unit with priority express courier. Tracking will be shared shortly.');
  
  // Select status: In Progress
  await page.selectOption('select:has-text("Replied")', 'In Progress');

  // Click Send Reply
  await page.click('button:has-text("Send Reply to Patron")');
  await page.waitForSelector('text=Reply sent successfully!', { timeout: 10000 });
  console.log('  ✓ Owner reply sent and confirmed');

  // Wait a moment for UI update
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_owner_ticket_conversation.png') });
  console.log('  ✓ Screenshot saved: 04_owner_ticket_conversation.png');

  // -------------------------------------------------------------------------
  // TEST 5: Verify Seller Dashboard DOES NOT have Support Tab
  // -------------------------------------------------------------------------
  console.log('\n[TEST 5] Verifying Seller Dashboard DOES NOT display Support tab...');
  await page.addInitScript((sellerData) => {
    localStorage.setItem('token', sellerData.token);
    localStorage.setItem('bb_token', sellerData.token);
    localStorage.setItem('user', JSON.stringify(sellerData.user));
    localStorage.setItem('bb_user', JSON.stringify(sellerData.user));
  }, { token: SELLER_TOKEN, user: SELLER_USER });

  // Clear owner auth and set seller auth
  await page.evaluate((sellerData) => {
    localStorage.setItem('token', sellerData.token);
    localStorage.setItem('bb_token', sellerData.token);
    localStorage.setItem('user', JSON.stringify(sellerData.user));
    localStorage.setItem('bb_user', JSON.stringify(sellerData.user));
  }, { token: SELLER_TOKEN, user: SELLER_USER });

  await page.goto('http://localhost:5173/seller/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const sellerSidebarText = await page.innerText('aside');
  const sellerHasSupport = sellerSidebarText.includes('Support');
  console.log('  Support tab in Seller sidebar:', sellerHasSupport ? '❌ FAIL (Should NOT be present)' : '✅ PASS (Correctly hidden)');

  // Try accessing /owner/support directly as Seller
  console.log('  Testing Seller direct URL navigation to /owner/support...');
  await page.goto('http://localhost:5173/owner/support', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const blockedOrRedirected = !page.url().includes('/owner/support') || (await page.$('text=Customer Support Management')) === null;
  console.log('  Seller blocked from accessing /owner/support:', blockedOrRedirected ? '✅ PASS' : '❌ FAIL');

  // Go back to seller dashboard to take screenshot
  await page.goto('http://localhost:5173/seller/dashboard', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_seller_sidebar_no_support.png') });
  console.log('  ✓ Screenshot saved: 05_seller_sidebar_no_support.png');

  console.log('\n=======================================================');
  console.log(' ALL BROWSER E2E VERIFICATION CHECKS COMPLETED! ');
  console.log('=======================================================');

  await browser.close();
}

runBrowserTests().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
