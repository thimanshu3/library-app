import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    
    // Attempt to mask puppeteer
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    })

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    
    const priceText = await page.evaluate(() => {
      const selectors = [
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '#price',
        '.a-color-price'
      ]
      
      for (const s of selectors) {
        const el = document.querySelector(s)
        if (el && el.textContent) {
          const text = el.textContent.trim()
          if (text.match(/[0-9]/)) {
            return text
          }
        }
      }
      return null
    })

    await browser.close()

    if (!priceText) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    const numericMatch = priceText.replace(/,/g, '').match(/[\d.]+/)
    const price = numericMatch ? parseFloat(numericMatch[0]) : null

    return NextResponse.json({ price, text: priceText })
  } catch (error: unknown) {
    console.error('Price Scrape Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Scrape failed' }, { status: 500 })
  }
}
