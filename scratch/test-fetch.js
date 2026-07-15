async function testFetch() {
  const url = 'https://olx.ba/shops/RAWAN_DOO'
  console.log('Fetching', url, '...')
  
  const res = await globalThis.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })

  console.log('Status:', res.status)
  const text = await res.text()
  console.log('HTML Length:', text.length)
  console.log('Preview:', text.substring(0, 500))
  
  // Check if blocked
  if (text.includes('Cloudflare') || text.includes('just a moment')) {
    console.log('BLOCKED BY CLOUDFLARE')
  } else {
    console.log('SUCCESSFULLY RETRIEVED')
  }
}

testFetch().catch(console.error)
