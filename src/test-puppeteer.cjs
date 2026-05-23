const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173');
  
  // Wait a second for load
  await new Promise(r => setTimeout(r, 1000));
  
  // Click on Route Typologies
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const routeBtn = buttons.find(b => b.textContent.includes('Route Typologies'));
    if (routeBtn) routeBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // Click on a route
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div'));
    const residential = cards.find(c => c.textContent.includes('Residential Street'));
    if (residential) residential.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
})();
