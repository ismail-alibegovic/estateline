import fs from 'fs'

function parseNuxt() {
  const html = fs.readFileSync('scratch/olx-aktivni.html', 'utf8')
  const match = html.match(/window\.__NUXT__=\((.*?)\);/s)
  if (!match) {
    console.log('No __NUXT__ script found.')
    return
  }

  // Write the __NUXT__ javascript evaluation block to a temp file and run it
  const nuxtCode = match[0]
  console.log('Found __NUXT__ block length:', nuxtCode.length)
  
  // Let's print out the script content to see what keys/data are present
  // To avoid evaluating it directly in a fragile way, we can search for strings
  const strings = html.match(/"[^"]*"/g) || []
  console.log('Total quoted strings in HTML:', strings.length)
  
  // Print strings containing real estate terms or numbers
  const interesting = strings.filter(s => {
    const lower = s.toLowerCase()
    return lower.includes('stan') || lower.includes('kuca') || lower.includes('sarajevo') || lower.includes('ilidza') || lower.includes('km') || lower.includes('artikal') || lower.includes('listing')
  })
  
  console.log('Interesting strings:', [...new Set(interesting)].slice(0, 30))
}

parseNuxt()
