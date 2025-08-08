const { chromium } = require('playwright');

(async () => {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the login page
    await page.goto('http://localhost:3000/login');
    console.log('Navigated to login page');

    // Wait for the form to be visible
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Fill in the login form
    await page.fill('#email', 'ramnishbase2brand@gmail.com');
    await page.fill('#password', 'Ramnish@123');
    console.log('Filled login form');

    // Click the login button
    await page.click('button[type="submit"]');
    console.log('Clicked login button');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log('Successfully logged in and redirected to dashboard');

    // Wait a bit to see the dashboard
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test navigation to different sections
    const sections = ['repair', 'customers', 'technicians', 'inventory', 'reports', 'settings'];
    
    for (const section of sections) {
      try {
        await page.click(`a[href="/dashboard/${section}"]`);
        console.log(`Navigated to ${section} section`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.error(`Error navigating to ${section} section:`, e.message);
      }
    }

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the browser
    await browser.close();
  }
})();