import fs from 'fs'

async function saveJson() {
  const url = 'https://olx.ba/api/search?user_id=3975969'
  const res = await globalThis.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  })

  const json = await res.json()
  fs.writeFileSync('scratch/olx-listings.json', JSON.stringify(json, null, 2), 'utf8')
  console.log('Saved scratch/olx-listings.json')
}

saveJson().catch(console.error)
