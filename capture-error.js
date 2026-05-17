const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3001/login');
    await page.waitForSelector('button', { timeout: 5000 });
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const testBtn = buttons.find(b => b.textContent.includes('TEST ADMIN LOGIN'));
      if (testBtn) testBtn.click();
    });
    
    // Wait until url changes
    await page.waitForFunction("window.location.pathname === '/dashboard'", { timeout: 10000 });
    console.log('Navigated to:', page.url());
    
    await new Promise(r => setTimeout(r, 3000)); // wait for hydration and error boundary

    const errorText = await page.evaluate(() => {
      const pre = document.querySelector('pre');
      if (pre) return pre.textContent;
      const redBoxes = Array.from(document.querySelectorAll('div')).filter(d => d.style && d.style.backgroundColor === 'red' || d.className.includes('bg-red'));
      if (redBoxes.length > 0) return redBoxes[0].textContent;
      // Search for 'Something went wrong' text
      const bodyText = document.body.innerText;
      if (bodyText.includes('Something went wrong')) {
        return bodyText.substring(bodyText.indexOf('Something went wrong'), bodyText.indexOf('Something went wrong') + 500);
      }
      return null;
    });
    
    if (errorText) {
      console.log('FOUND RED BOX ERROR:', errorText);
    } else {
      console.log('No red box found.');
    }
    
  } catch (err) {
    console.error('Script Error:', err.message);
  } finally {
    await browser.close();
  }
})();
