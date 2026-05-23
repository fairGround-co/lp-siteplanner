import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('BROWSER PAGEERROR:', error.message);
    });

    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1000));
    
    // Open Config
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Configure System'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Open Route Typologies
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Route Typologies'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Click Residential Street
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div'));
      const card = cards.find(c => c.textContent.includes('Residential Street'));
      if (card) card.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Output HTML to see if there's a Vite error overlay
    const rootHTML = await page.evaluate(() => document.documentElement.innerHTML);
    if (rootHTML.includes('vite-error-overlay')) {
      console.log('VITE ERROR OVERLAY DETECTED!');
    }
    
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
