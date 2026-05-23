import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      } else {
        console.log('LOG:', msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1000));
    
    const rootHTML = await page.evaluate(() => document.getElementById('root').innerHTML);
    console.log("ROOT HTML LENGTH:", rootHTML.length);
    
    const texts = await page.evaluate(() => Array.from(document.body.querySelectorAll('*')).map(n => n.textContent).filter(t => t && t.trim().length > 0 && t.trim().length < 50));
    console.log("TEXTS:", texts.slice(0, 20));

    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
