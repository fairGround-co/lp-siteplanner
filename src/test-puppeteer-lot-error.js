import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
        msg.args().forEach(async (arg) => {
          const val = await arg.jsonValue();
          console.log('ARG:', val);
        });
      } else {
        console.log('LOG:', msg.text());
      }
    });
    
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1000));
    
    // Click Configure System
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Configure System'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Click Lot Typologies
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Lot Typologies'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Click Shotgun House
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div'));
      const shotgun = cards.find(c => c.textContent.includes('Shotgun House'));
      if (shotgun) shotgun.click();
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
