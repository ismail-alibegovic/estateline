async function probe() {
  const userId = 3975969
  
  const endpoints = [
    `https://olx.ba/api/search?user_id=${userId}`,
    `https://olx.ba/api/listings?user_id=${userId}`,
    `https://api.olx.ba/search?user_id=${userId}`,
    `https://api.olx.ba/listings?user_id=${userId}`,
    `https://api.olx.ba/users/${userId}/listings`,
    `https://olx.ba/api/users/${userId}/listings`,
    `https://api.olx.ba/shops/${userId}/listings`
  ]

  for (const url of endpoints) {
    try {
      console.log('Probing:', url)
      const res = await globalThis.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      })
      console.log('Status:', res.status)
      if (res.status === 200) {
        const text = await res.text()
        console.log('Response Length:', text.length)
        console.log('Response (first 100 chars):', text.substring(0, 100))
      }
    } catch (err) {
      console.log('Failed:', err.message)
    }
    console.log('-------------------')
  }
}

probe().catch(console.error)
