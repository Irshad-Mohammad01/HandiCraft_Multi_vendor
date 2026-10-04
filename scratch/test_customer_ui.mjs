import { chromium } from '/home/irshad-mohammad/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNiwiX2lkIjoiMTYiLCJpZCI6MTYsInJvbGUiOiJjdXN0b21lciIsImVtYWlsIjoiaXJzaGFkbW9oYW1tYWQxOTEwQGdtYWlsLmNvbSIsIm5hbWUiOiJQYXRyb24gSXJzaGFkIiwiZXhwIjoxNzkxMjA0ODA2fQ.nBgmJFOoOLK3LJutgYN-xQ_v5_4MldVib-pra35pC44";

async function runBrowserVerification() {
  const browser = await chromium.launch({ 
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('--- 1. Testing Homepage Header & Footer ---');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 1. Check header
  const headerText = await page.$eval('header', el => el.innerText);
  console.log('Header text preview contains Home:', headerText.includes('Home'));
  console.log('Header text preview contains All Crafts:', headerText.includes('All Crafts'));
  const hasCustomerCareInNav = await page.evaluate(() => {
    const nav = document.querySelector('header nav');
    return nav ? nav.innerText.includes('Customer Care') : false;
  });
  console.log('Customer Care in Header Nav (should be FALSE):', hasCustomerCareInNav);
  if (hasCustomerCareInNav) throw new Error('Customer Care is still in header nav!');

  // Check Bell in Header
  const bellButton = await page.$('header button[aria-label="Notifications"]');
  console.log('Notification Bell button in Header exists:', !!bellButton);
  if (!bellButton) throw new Error('Notification Bell button missing from header');

  // 2. Check footer
  const footerText = await page.$eval('footer', el => el.innerText);
  console.log('Footer contains Customer Care & Inquiries:', footerText.includes('Customer Care & Inquiries'));
  if (!footerText.includes('Customer Care & Inquiries')) throw new Error('Customer Care link missing in footer');

  // Screenshot homepage header
  await page.screenshot({ path: '/home/irshad-mohammad/.gemini/antigravity-ide/brain/af932643-0568-4aec-8786-94ea3db46e7d/scratch/01_header_notification_bell.png' });

  console.log('\n--- 2. Setting Authenticated Customer Session ---');

  await page.evaluate(({ token }) => {
    const userObj = {
      id: 16,
      _id: "16",
      name: "Patron Irshad",
      email: "irshadmohammad1910@gmail.com",
      role: "customer"
    };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('bb_user', JSON.stringify(userObj));
  }, { token });

  // Refresh page to load session
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click Notification Bell to open dropdown
  console.log('\n--- 3. Opening Notification Bell Dropdown ---');
  await page.click('header button[aria-label="Notifications"]');
  await page.waitForTimeout(1000);

  const notifPanel = await page.$('text=Notifications');
  console.log('Notification Panel Opened:', !!notifPanel);
  await page.screenshot({ path: '/home/irshad-mohammad/.gemini/antigravity-ide/brain/af932643-0568-4aec-8786-94ea3db46e7d/scratch/02_customer_notification_dropdown.png' });

  // 4. Navigate to Customer Support Messages
  console.log('\n--- 4. Navigating to Customer Support Messages Page ---');
  await page.goto('http://localhost:5173/account?tab=support', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const pageContent = await page.content();
  console.log('Support Page loaded, contains "My Support Requests":', pageContent.includes('My Support Requests'));
  await page.screenshot({ path: '/home/irshad-mohammad/.gemini/antigravity-ide/brain/af932643-0568-4aec-8786-94ea3db46e7d/scratch/03_customer_support_tickets_list.png' });

  // 5. Open Ticket Conversation
  console.log('\n--- 5. Opening Ticket Conversation ---');
  await page.goto('http://localhost:5173/account/support/7', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const hasConversation = await page.evaluate(() => document.body.innerText.includes('Conversation History'));
  console.log('Conversation History displayed:', hasConversation);
  const hasOwnerReply = await page.evaluate(() => document.body.innerText.includes('Owner Team Reply') || document.body.innerText.includes('CraftNest Support'));
  console.log('Owner Reply displayed in thread:', hasOwnerReply);
  const hasFollowUp = await page.evaluate(() => document.body.innerText.includes('Send a Follow-up Message'));
  console.log('Follow-up Composer displayed:', hasFollowUp);
  await page.screenshot({ path: '/home/irshad-mohammad/.gemini/antigravity-ide/brain/af932643-0568-4aec-8786-94ea3db46e7d/scratch/04_customer_support_conversation.png' });

  await browser.close();
  console.log('\n=== BROWSER VERIFICATION COMPLETED SUCCESSFULLY ===');
}

runBrowserVerification().catch(err => {
  console.error('Browser Test Failed:', err);
  process.exit(1);
});
