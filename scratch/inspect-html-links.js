import fs from 'fs'

function inspectLinks() {
  const html = fs.readFileSync('scratch/olx-aktivni.html', 'utf8')
  
  // Find all URLs matching http/https or relative api paths
  const urlRegex = /(https?:\/\/[^\s"']+)/g
  const matches = html.match(urlRegex) || []
  
  console.log('Total URLs found:', matches.length)
  const uniqueUrls = [...new Set(matches)]
  
  console.log('Unique API or interesting URLs:')
  uniqueUrls.forEach(url => {
    if (url.includes('api') || url.includes('nuxt') || url.includes('json') || url.includes('cloudfront')) {
      console.log(' -', url)
    }
  })
}

inspectLinks()
