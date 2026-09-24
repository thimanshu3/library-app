const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BOOKS_FILE = path.join(__dirname, '../data/books.json');
const COVERS_DIR = path.join(__dirname, '../public/covers');

if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

async function downloadImage(url, dest) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 10000
    });
    
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    return false;
  }
}

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let browser = null;

async function getBrowser() {
    if (!browser || !browser.isConnected()) {
        if (browser) await browser.close().catch(()=> {});
        browser = await puppeteer.launch({ 
            headless: false, 
            defaultViewport: null,
            args: ['--start-maximized', '--disable-dev-shm-usage', '--no-sandbox'] 
        });
    }
    return browser;
}

(async () => {
  console.log('[+] RE-INITIATING OPERATION ALPHA-TANGO-THREE (V3)...');
  
  const booksData = JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf8'));
  
  const startIndex = 110;
  const endIndex = Math.min(299, booksData.length - 1);
  
  for (let i = startIndex; i <= endIndex; i++) {
    const book = booksData[i];
    
    // Skip if already processed
    if (book.description && book.description.length > 50 && book.photoUrl && book.photoUrl.startsWith('/covers/cover_')) {
        console.log(`[>] Target ${i} (${book.title}) already secured. Skipping.`);
        continue;
    }

    console.log(`\n[>] Deploying to Target ${i}: ${book.title} by ${book.author}`);
    
    let page;
    try {
      const b = await getBrowser();
      page = await b.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // 1. EXTRACT DESCRIPTION
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.author + ' book goodreads')}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(1500);
      
      let description = '';
      const kpSelector = 'div[data-attrid="description"] span, div.LGOjhe span';
      const hasKp = await page.$(kpSelector).catch(() => null);
      if (hasKp) {
        description = await page.evaluate((sel) => {
            const els = document.querySelectorAll(sel);
            let text = '';
            els.forEach(el => text += el.innerText.trim() + ' ');
            return text.trim();
        }, kpSelector);
      }
      
      if (!description || description.length < 50) {
        description = await page.evaluate(() => {
           const result = document.querySelector('.VwiC3b, .yXK7lf');
           return result ? result.innerText.trim() : '';
        });
      }

      if (description) {
         book.description = description.replace(/^.*? \— /, '');
         console.log('[+] Description intel secured.');
      }

      // 2. EXTRACT IMAGE
      const imageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(book.title + ' ' + book.author + ' book cover')}`;
      await page.goto(imageSearchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(1500);
      
      const firstImage = await page.$('div[jsname="N9X1R"] img, img.rg_i').catch(() => null);
      if (firstImage) {
          await firstImage.click().catch(() => {});
          await delay(2000);
          
          const src = await page.evaluate(() => {
              const allImages = Array.from(document.querySelectorAll('img'));
              let maxArea = 0;
              let bestSrc = null;
              for (let img of allImages) {
                const rect = img.getBoundingClientRect();
                const area = rect.width * rect.height;
                if (area > maxArea && img.src && img.src.startsWith('http') && !img.src.includes('encrypted-tbn0.gstatic.com') && area > 20000) {
                  maxArea = area;
                  bestSrc = img.src;
                }
              }
              return bestSrc;
          }).catch(() => null);
          
          if (src) {
             const cleanTitle = book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
             const filename = `cover_${book.id}_${cleanTitle}.jpg`;
             const dest = path.join(COVERS_DIR, filename);
             
             const downloaded = await downloadImage(src, dest);
             if (downloaded !== false) {
                 book.photoUrl = `/covers/${filename}`;
                 console.log(`[+] Visual intel secured: ${filename}`);
             }
          }
      }
      
      fs.writeFileSync(BOOKS_FILE, JSON.stringify(booksData, null, 2), 'utf8');
      
    } catch (err) {
      console.error(`[-] CRITICAL FAILURE on target ${i}:`, err.message);
      // Close browser to force recreation next loop
      if (browser) {
          await browser.close().catch(()=>{});
          browser = null;
      }
    } finally {
      if (page && !page.isClosed()) await page.close().catch(() => {});
    }
  }

  console.log('[+] OPERATION ALPHA-TANGO-THREE COMPLETED.');
  if (browser) await browser.close().catch(()=>{});
})();
