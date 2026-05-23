import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1000));
    
    // Open Config
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Configure System'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Open Lot Typologies
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Lot Typologies'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Click Shotgun House
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div'));
      const shotgun = cards.find(c => c.textContent.includes('Shotgun House'));
      if (shotgun) shotgun.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await page.screenshot({ path: 'artifacts/screenshot.png' });
    
    const rootHTML = await page.evaluate(() => document.getElementById('root').innerHTML);
    console.log("HTML LENGTH:", rootHTML.length);
    
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
