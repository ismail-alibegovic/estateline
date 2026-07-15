import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  const { org, supabase, user } = ctx

  try {
    const body = await request.json().catch(() => ({}))
    const { direction, olx_url } = body

    if (direction === 'pull') {
      if (!olx_url) {
        return NextResponse.json({ error: 'OLX URL is required' }, { status: 400 })
      }

      // Clean URL to point to main shop/profile page
      let cleanUrl = olx_url
      try {
        const parsed = new URL(olx_url)
        const parts = parsed.pathname.split('/').filter(Boolean)
        const shopsIdx = parts.indexOf('shops')
        const profilIdx = parts.indexOf('profil')
        
        if (shopsIdx !== -1 && parts[shopsIdx + 1]) {
          cleanUrl = `${parsed.origin}/shops/${parts[shopsIdx + 1]}`
        } else if (profilIdx !== -1 && parts[profilIdx + 1]) {
          cleanUrl = `${parsed.origin}/profil/${parts[profilIdx + 1]}`
        }
      } catch (e: any) {
        console.error('URL cleanup failed:', e.message)
      }

      console.log('Fetching HTML from main page:', cleanUrl)
      
      // 1. Fetch HTML to extract User ID
      const htmlRes = await globalThis.fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        }
      })
      
      if (!htmlRes.ok) {
        return NextResponse.json({ error: `Failed to fetch OLX page: ${htmlRes.statusText}` }, { status: 400 })
      }

      const html = await htmlRes.text()
      
      // Parse User ID using double-insurance
      let userId = null
      const literalMatch = html.match(/user:\{type:"[^"]*",id:(\d+)/)
      if (literalMatch) {
        userId = literalMatch[1]
      } else {
        const avatarMatch = html.match(/avatars(?:\\u002F|\/)(\d+)(?:\\u002F|\/)/)
        if (avatarMatch) {
          userId = avatarMatch[1]
        }
      }

      if (!userId) {
        return NextResponse.json({ error: 'Could not extract User ID from this OLX page. Please ensure it is a valid shop or user profile link.' }, { status: 400 })
      }

      // Update organization table with the profile URL
      await supabase
        .from('organizations')
        .update({ olx_profile_url: olx_url })
        .eq('id', org.id)

      // 2. Fetch JSON listings from the public search API
      const apiURL = `https://olx.ba/api/search?user_id=${userId}`
      console.log('Fetching listings JSON from:', apiURL)
      
      const jsonRes = await globalThis.fetch(apiURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      })

      if (!jsonRes.ok) {
        return NextResponse.json({ error: `Failed to fetch listings API: ${jsonRes.statusText}` }, { status: 400 })
      }

      const json = await jsonRes.json()
      const listings = json.data || []
      const imported = []

      for (const item of listings) {
        const externalId = `OLX-${item.id}`

        // Check if property is already syndicating/imported
        const { data: existingSyn } = await supabase
          .from('property_syndications')
          .select('id, property_id')
          .eq('organization_id', org.id)
          .eq('portal_name', 'olx')
          .eq('external_id', externalId)
          .maybeSingle()

        if (existingSyn) {
          continue // Already imported
        }

        // --- FETCH FULL DETAILS ---
        let detailData: any = null
        try {
          const detailRes = await globalThis.fetch(`https://olx.ba/api/listings/${item.id}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            }
          })
          if (detailRes.ok) {
            detailData = await detailRes.json()
          }
        } catch (detailErr) {
          console.error(`Failed to fetch details for listing ${item.id}:`, detailErr)
        }

        // Map Category ID & Title to valid property_type enum:
        // 'apartment', 'house', 'land', 'commercial', 'office', 'warehouse', 'garage', 'other'
        let type = 'apartment'
        const lowerTitle = item.title.toLowerCase()
        if (item.category_id === 24 || lowerTitle.includes('kuća') || lowerTitle.includes('vila') || lowerTitle.includes('kuca')) {
          type = 'house'
        } else if (item.category_id === 29 || lowerTitle.includes('zemljište') || lowerTitle.includes('plac') || lowerTitle.includes('zemljiste')) {
          type = 'land'
        } else if (item.category_id === 26 || item.category_id === 27 || lowerTitle.includes('poslovni') || lowerTitle.includes('poslovni prostor')) {
          type = 'office'
        } else if (lowerTitle.includes('garaža') || lowerTitle.includes('garaza')) {
          type = 'garage'
        }

        // Parse area size
        let areaSize = 0
        if (item.special_labels) {
          const sizeLabel = item.special_labels.find((l: any) => l.label === 'Kvadrata')
          if (sizeLabel) {
            areaSize = parseFloat(sizeLabel.value) || 0
          }
        }

        // Parse bedrooms count
        let bedrooms = 0
        if (item.special_labels) {
          const bedLabel = item.special_labels.find((l: any) => l.label === 'Broj Soba')
          if (bedLabel) {
            bedrooms = parseInt(bedLabel.value) || 0
          }
        }

        // --- EXTRACT FROM DETAIL ATTRIBUTES ---
        let bathrooms = 1
        let floors = 1
        let address = ''
        let yearBuilt = null
        const features: string[] = []

        // Extract full description
        let description = detailData?.additional?.description || item.description || ''
        if (description) {
          // Replace HTML break tags with clean line breaks
          description = description
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/&nbsp;/gi, ' ')
            .replace(/<[^>]*>/g, '') // strip other html tags
        } else {
          description = `Predivna nekretnina "${item.title}". Površina iznosi ${areaSize} m² sa ${bedrooms} spavaćih soba. Uvezeno automatski sa vašeg OLX.ba profila.`
        }

        const attributesList = detailData?.attributes || []
        attributesList.forEach((attr: any) => {
          const code = attr.attr_code
          const val = attr.value
          if (code === 'broj-kupatila') {
            bathrooms = parseInt(val) || 1
          } else if (code === 'sprat') {
            floors = parseInt(val) || 1
          } else if (code === 'adresa') {
            address = val || ''
          } else if (code === 'godina-izgradnje') {
            yearBuilt = parseInt(val) || null
          }

          // Gather characteristics as features list
          if (val && val !== 'false') {
            if (code === 'vrsta-grijanja') {
              features.push(`Grijanje: ${val}`)
            } else if (code === 'namjesten') {
              features.push(`Opremljenost: ${val}`)
            } else if (code === 'stanje') {
              features.push(`Stanje: ${val}`)
            } else if (code === 'internet' && val === 'true') {
              features.push('Internet')
            } else if (code === 'kablovska-tv' && val === 'true') {
              features.push('Kablovska TV')
            } else if (code === 'gara-a' && val === 'true') {
              features.push('Garaža')
            } else if (code === 'balkon' && val === 'true') {
              features.push('Balkon')
            }
          }
        })

        // Format and structure photos as object components {url, caption, order}
        const rawImagesList: string[] = detailData?.images || item.images || [item.image]
        const imagesObjects = rawImagesList.map((img: string, idx: number) => ({
          url: img,
          caption: `${item.title} - Slika ${idx + 1}`,
          order: idx
        }))

        // Map city
        let city = 'Sarajevo'
        if (item.city_id === 39 || lowerTitle.includes('visoko')) {
          city = 'Visoko'
        } else if (lowerTitle.includes('mostar')) {
          city = 'Mostar'
        } else if (lowerTitle.includes('banja luka')) {
          city = 'Banja Luka'
        } else if (lowerTitle.includes('tuzla')) {
          city = 'Tuzla'
        } else if (lowerTitle.includes('zavidovići') || lowerTitle.includes('zavidovici')) {
          city = 'Zavidovići'
        }

        // Map transaction pricing period
        const pricePeriod = item.listing_type === 'rent' ? 'monthly' : null

        const propSlug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')

        const { data: prop, error: propErr } = await supabase
          .from('properties')
          .insert({
            organization_id: org.id,
            title: item.title,
            slug: `${propSlug}-${item.id}-${Math.floor(Math.random() * 100)}`,
            description,
            price: Number(item.price) || 0,
            currency: 'BAM',
            type,
            status: 'active',
            city,
            country: 'BA',
            price_period: pricePeriod,
            latitude: item.location?.lat ? Number(item.location.lat) : null,
            longitude: item.location?.lon ? Number(item.location.lon) : null,
            address: address || null,
            area_size: areaSize,
            bedrooms,
            bathrooms,
            floors,
            year_built: yearBuilt,
            features,
            cover_image_url: item.image,
            images: imagesObjects
          })
          .select('id, title, price')
          .single()

        if (propErr || !prop) {
          console.error('OLX Sync Insert Error:', propErr)
          continue
        }

        // Insert syndication link
        await supabase
          .from('property_syndications')
          .insert({
            organization_id: org.id,
            property_id: prop.id,
            portal_name: 'olx',
            status: 'active',
            external_id: externalId,
            last_synced_at: new Date().toISOString()
          })

        imported.push(prop)
      }

      // Log activity
      if (imported.length > 0) {
        await supabase
          .from('activity_log')
          .insert({
            organization_id: org.id,
            type: 'property_synced',
            description: `Imported ${imported.length} active listings from OLX profile link.`,
            metadata: { count: imported.length },
            user_id: user.id
          })
      }

      return NextResponse.json({
        message: 'Import complete',
        importedCount: imported.length,
        imported
      })
    }

    // --- Original PUSH (Syndication) Logic ---
    const { data: syndications, error } = await supabase
      .from('property_syndications')
      .select(`
        id,
        property_id,
        external_id,
        organization_id,
        properties (
          title,
          description,
          price,
          currency,
          type,
          city
        )
      `)
      .eq('organization_id', org.id)
      .eq('portal_name', 'olx')
      .eq('status', 'active')

    if (error) throw error

    if (!syndications || syndications.length === 0) {
      return NextResponse.json({ message: 'No OLX syndications to sync.' })
    }

    const results = []
    for (const syn of syndications) {
      const prop = syn.properties as any
      if (!prop) continue

      try {
        const mockExternalId = syn.external_id || 'OLX_' + Math.floor(Math.random() * 100000)
        
        await supabase
          .from('property_syndications')
          .update({
            external_id: mockExternalId,
            last_synced_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', syn.id)

        results.push({ id: syn.id, status: 'success', external_id: mockExternalId })
      } catch (err: any) {
        await supabase
          .from('property_syndications')
          .update({
            status: 'error',
            error_message: err.message || 'Unknown error'
          })
          .eq('id', syn.id)

        results.push({ id: syn.id, status: 'error', message: err.message })
      }
    }

    return NextResponse.json({ message: 'Push sync complete', results })
  } catch (err: any) {
    console.error('OLX Sync Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
