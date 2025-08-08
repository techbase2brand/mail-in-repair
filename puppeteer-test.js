const puppeteer = require('puppeteer');

(async () => {
  // Launch the browser
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the login page
    await page.goto('http://localhost:3000/login');
    console.log('Navigated to login page');

    // Wait for the form to be visible
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Fill in the login form
    await page.type('#email', 'ramnishbase2brand@gmail.com');
    await page.type('#password', 'Ramnish@123');
    console.log('Filled login form');

    // Click the login button
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ timeout: 30000 })
    ]);
    console.log('Clicked login button');

    // Check if we're on the dashboard
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log('Successfully logged in and redirected to dashboard');
    } else {
      console.log('Failed to login. Current URL:', url);
    }

    // Wait a bit to see the dashboard
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test navigation to different sections
    const sections = ['repair', 'customers', 'technicians', 'inventory', 'reports', 'settings'];
    
    for (const section of sections) {
      try {
        await Promise.all([
          page.click(`a[href="/dashboard/${section}"]`),
          page.waitForNavigation({ timeout: 10000 })
        ]);
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