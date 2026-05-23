import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log(`[${msg.type()}]`, msg.text());
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
    
    // Check Route Editor
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Route Typologies'))?.click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('div')).find(c => c.textContent.includes('Residential Street'))?.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log("ROUTE EDITOR MOUNTED");

    // Go back to config
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back'))?.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Check Lot Editor
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Lot Typologies'))?.click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('div')).find(c => c.textContent.includes('Shotgun House'))?.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log("LOT EDITOR MOUNTED");

    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
