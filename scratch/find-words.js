import fs from 'fs'

function findWords() {
  const html = fs.readFileSync('scratch/olx-rawan.html', 'utf8')
  
  // Find all links (href) containing /artikal/
  const artikalRegex = /\/artikal\/\d+/g
  const matches = html.match(artikalRegex) || []
  console.log('Found artikal links count:', matches.length)
  console.log('Unique artikal links:', [...new Set(matches)].slice(0, 10))

  // Find occurrences of numbers followed by KM or similar price signs
  const priceRegex = /\d+(\.\d+)?\s*(KM|BAM)/gi
  const priceMatches = html.match(priceRegex) || []
  console.log('Found price tags count:', priceMatches.length)
  console.log('Preview prices:', priceMatches.slice(0, 10))
}

findWords()
