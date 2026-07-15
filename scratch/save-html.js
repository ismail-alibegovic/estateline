import fs from 'fs'

async function saveHtml() {
  const url = 'https://olx.ba/shops/RAWAN_DOO'
  const res = await globalThis.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })

  const html = await res.text()
  fs.writeFileSync('scratch/olx-rawan.html', html, 'utf8')
  console.log('Saved scratch/olx-rawan.html')
}

saveHtml().catch(console.error)
