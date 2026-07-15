async function runSync(url) {
  console.log('Syncing from URL:', url)
  
  // Clean URL to point to main shop/profile page
  let cleanUrl = url
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    
    // If URL has trail subpages like 'aktivni', remove them
    const shopsIdx = parts.indexOf('shops')
    const profilIdx = parts.indexOf('profil')
    
    if (shopsIdx !== -1 && parts[shopsIdx + 1]) {
      cleanUrl = `${parsed.origin}/shops/${parts[shopsIdx + 1]}`
    } else if (profilIdx !== -1 && parts[profilIdx + 1]) {
      cleanUrl = `${parsed.origin}/profil/${parts[profilIdx + 1]}`
    }
  } catch (e) {
    console.error('URL cleanup failed:', e.message)
  }

  console.log('Fetching HTML from main page:', cleanUrl)
  const htmlRes = await globalThis.fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    }
  })
  
  const html = await htmlRes.text()
  
  // Parse User ID: Double insurance (literal ID or inside avatar URL)
  let userId = null
  
  // 1. Try literal id inside the user block
  const literalMatch = html.match(/user:\{type:"[^"]*",id:(\d+)/)
  if (literalMatch) {
    userId = literalMatch[1]
    console.log('Parsed User ID from literal user block:', userId)
  } else {
    // 2. Try parsing from avatar URL
    const avatarMatch = html.match(/avatars(?:\\u002F|\/)(\d+)(?:\\u002F|\/)/)
    if (avatarMatch) {
      userId = avatarMatch[1]
      console.log('Parsed User ID from avatar URL:', userId)
    }
  }

  if (!userId) {
    console.error('Could not find user ID in page HTML.')
    return
  }

  // 2. Fetch JSON listings
  const apiURL = `https://olx.ba/api/search?user_id=${userId}`
  console.log('Fetching listings JSON from:', apiURL)
  
  const jsonRes = await globalThis.fetch(apiURL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  })

  const json = await jsonRes.json()
  const listings = json.data || []
  console.log('Total listings found on API:', listings.length)

  // 3. Print parsed properties details
  listings.forEach((item, index) => {
    let type = 'apartment'
    if (item.category_id === 24) type = 'house'
    else if (item.category_id === 29) type = 'land'
    else if (item.category_id === 26 || item.category_id === 27) type = 'office'

    let areaSize = 0
    if (item.special_labels) {
      const sizeLabel = item.special_labels.find(l => l.label === 'Kvadrata')
      if (sizeLabel) areaSize = parseFloat(sizeLabel.value)
    }

    console.log(`[${index + 1}] Title:`, item.title)
    console.log(`    Price:`, item.price, 'KM')
    console.log(`    Type:`, type)
    console.log(`    Area:`, areaSize, 'm2')
    console.log(`    Coords:`, item.location?.lat, ',', item.location?.lon)
    console.log('---------------------------')
  })
}

runSync('https://olx.ba/shops/RAWAN_DOO/aktivni').catch(console.error)
