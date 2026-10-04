import('/home/irshad-mohammad/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs').then(async ({ chromium }) => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const ownerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJpZCI6MSwiX2lkIjoiMSIsInJvbGUiOiJvd25lciIsInVzZXJuYW1lIjoiRGV2aWthIFN1bmRhcmFtIiwibmFtZSI6IkRldmlrYSBTdW5kYXJhbSIsImVtYWlsIjoib3duZXJAY3JhZnRuZXN0LmluIiwiaXNfYWRtaW4iOnRydWUsImV4cCI6MTc5MTcyNTI3N30.h-eSxy01uJXuKVeYLF-Wy4w26cDDK0qBlRjRppfzZMU';
  const ownerUser = { id: 1, _id: '1', role: 'owner', name: 'Devika Sundaram', email: 'owner@craftnest.in', is_admin: true };
  
  await page.goto('http://localhost:5173/owner/products');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('bb_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('bb_user', JSON.stringify(user));
  }, { token: ownerToken, user: ownerUser });

  await page.goto('http://localhost:5173/owner/products', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click Add New Handicraft
  await page.click('button:has-text("Add New Handicraft")');
  await page.waitForTimeout(500);

  // Intercept the POST request and response
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/products')) {
      console.log('Intercepted POST URL:', req.url());
      console.log('Intercepted POST Payload:', req.postData());
    }
  });

  page.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('/products')) {
      console.log('Intercepted POST Status:', res.status());
      try {
        console.log('Intercepted POST Response Body:', await res.text());
      } catch (e) {
        console.log('Could not get response body:', e);
      }
    }
  });

  // Fill in the fields like the user did:
  // Craft Title: new
  await page.fill('input[placeholder*="Terracotta Water Urn"]', 'new');
  // Selling price: 1299
  await page.fill('input[placeholder="1299"]', '1299');
  // Original MRP: 1699
  await page.fill('input[placeholder="1699"]', '1699');
  // Available stock: 17
  await page.fill('input[placeholder="15"]', '17');
  // Artisan Name: Mr ID
  await page.fill('input[placeholder*="Mohan Lal"]', 'Mr ID');
  // Image URL:
  await page.fill('input[placeholder*="unsplash.com"]', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61');
  // Description: new
  await page.fill('textarea[placeholder*="Describe the craft"]', 'new');
  // Materials: pure
  await page.fill('input[placeholder*="Terracotta clay"]', 'pure');
  // Origin: jaipur
  await page.fill('input[placeholder*="Jaipur"]', 'jaipur');

  // Check what categories are in the select
  const selectOptions = await page.$$eval('select option', opts => opts.map(o => ({ value: o.value, text: o.text })));
  console.log('Category select options:', selectOptions);

  const selectedValue = await page.$eval('select', sel => sel.value);
  console.log('Currently selected category value:', selectedValue);

  // Submit form
  console.log('Clicking Add Handicraft submit button...');
  await page.click('button[type="submit"]:has-text("Add Handicraft")');
  await page.waitForTimeout(2000);

  // Check if error message is displayed
  const errorText = await page.evaluate(() => {
    const err = document.querySelector('.bg-\\[\\#FFEBEE\\], [style*="color-error"], [style*="#FFEBEE"]');
    return err ? err.innerText : null;
  });
  console.log('Error message on modal:', errorText);

  await browser.close();
});
