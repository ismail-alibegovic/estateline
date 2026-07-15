import fs from 'fs'

function printLabels() {
  const json = JSON.parse(fs.readFileSync('scratch/olx-listings.json', 'utf8'))
  const listings = json.data || []

  listings.forEach((item, index) => {
    console.log(`[${index + 1}] Title:`, item.title)
    console.log('    Special Labels:', item.special_labels)
    console.log('----------------------------')
  })
}

printLabels()
