import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Configure System'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Route Typologies'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    const cardTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.library-card-content h3')).map(h3 => h3.textContent);
    });
    console.log("CARD TEXTS:", cardTexts);
    
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
