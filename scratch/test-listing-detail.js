async function testDetail() {
  const listingId = 71879788 // RAWAN | stan | 81 m2
  const url = `https://olx.ba/api/listings/${listingId}`
  console.log('Fetching detail from:', url)
  
  const res = await globalThis.fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  })

  console.log('Status:', res.status)
  if (res.status === 200) {
    const json = await res.json()
    console.log('Keys in detail response:', Object.keys(json))
    
    // Save to check structure
    import('fs').then(fs => {
      fs.writeFileSync('scratch/olx-detail-71879788.json', JSON.stringify(json, null, 2), 'utf8')
      console.log('Saved scratch/olx-detail-71879788.json')
    })
  }
}

testDetail().catch(console.error)
