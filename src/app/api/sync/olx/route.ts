import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { cleanOlxUrl, mapOlxCategoryToPropertyType, cleanOlxDescription } from '@/lib/olx-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  const { org, supabase } = ctx

  try {
    const { data: syndications, error } = await supabase
      .from('property_syndications')
      .select('id, property_id, status, external_id, last_synced_at, error_message')
      .eq('organization_id', org.id)
      .eq('portal_name', 'olx')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const activeCount = (syndications || []).filter(s => s.status === 'active').length
    const errorCount = (syndications || []).filter(s => s.status === 'error').length
    const lastSynced = (syndications || []).reduce((latest: string | null, s: any) => {
      if (!s.last_synced_at) return latest
      if (!latest || new Date(s.last_synced_at) > new Date(latest)) return s.last_synced_at
      return latest
    }, null)

    return NextResponse.json({
      organization_id: org.id,
      olx_profile_url: (org as any).olx_profile_url || null,
      total_syndicated: (syndications || []).length,
      active_count: activeCount,
      error_count: errorCount,
      last_synced_at: lastSynced,
      syndications: syndications || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const ctx = await getRouteContext()
  if (isAuthError(ctx)) return ctx

  const { org, supabase } = ctx

  try {
    const body = await request.json().catch(() => ({}))
    const { direction, olx_url } = body

    if (direction === 'pull' || !direction) {
      const targetUrl = olx_url || (org as any).olx_profile_url
      if (!targetUrl) {
        return NextResponse.json({ error: 'OLX profile URL is required' }, { status: 400 })
      }

      // Clean URL to point to main shop/profile page
      const cleanUrl = cleanOlxUrl(targetUrl)

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
      
      // Parse User ID
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

      // Update organization table with profile URL
      await supabase
        .from('organizations')
        .update({ olx_profile_url: targetUrl })
        .eq('id', org.id)

      // 2. Fetch JSON listings from the public search API
      const apiURL = `https://olx.ba/api/search?user_id=${userId}`
      
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
      const imported: any[] = []

      for (const item of listings) {
        const externalId = `OLX-${item.id}`

        // Check if listing already imported
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

        // Fetch detail data from API
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

        // Map Category ID & Title to property_type
        const type = mapOlxCategoryToPropertyType(item.category_id, item.title)

        // Parse area size
        let areaSize = 0
        if (item.special_labels) {
          const sizeLabel = item.special_labels.find((l: any) => l.label === 'Kvadrata' || l.label === 'Kvadratura')
          if (sizeLabel) {
            areaSize = parseFloat(sizeLabel.value) || 0
          }
        }

        // Parse rooms count
        let bedrooms = 1
        if (item.special_labels) {
          const bedLabel = item.special_labels.find((l: any) => l.label === 'Broj Soba' || l.label === 'Broj soba')
          if (bedLabel) {
            bedrooms = parseInt(bedLabel.value) || 1
          }
        }

        // Deep extraction from listing attributes
        let bathrooms = 1
        let floors = 1
        let address = ''
        let yearBuilt = null
        const features: string[] = []

        const attributesList = detailData?.attributes || []
        attributesList.forEach((attr: any) => {
          const code = (attr.attr_code || '').toLowerCase()
          const label = (attr.name || attr.label || '').toLowerCase()
          const val = (attr.value || '').toString().trim()

          if (!val || val === 'false') return

          // Rooms & Bathrooms
          if (code === 'broj-soba' || code === 'sobe' || label.includes('broj soba')) {
            bedrooms = parseInt(val) || bedrooms
          } else if (code === 'broj-kupatila' || code === 'kupatila' || label.includes('kupatil')) {
            bathrooms = parseInt(val) || 1
          } else if (code === 'sprat' || label.includes('sprat')) {
            floors = parseInt(val) || 1
          } else if (code === 'adresa' || label.includes('adresa')) {
            address = val
          } else if (code === 'godina-izgradnje' || label.includes('godina izgradnje')) {
            yearBuilt = parseInt(val) || null
          }

          // Feature flags
          if (code === 'vrsta-grijanja' || label.includes('grijanje')) {
            features.push(`Grijanje: ${val}`)
          } else if (code === 'namjesten' || label.includes('namješten') || label.includes('oprem')) {
            features.push(`Opremljenost: ${val}`)
          } else if (code === 'stanje' || label.includes('stanje')) {
            features.push(`Stanje: ${val}`)
          } else if (code === 'internet' || val === 'true') {
            features.push('Internet')
          } else if (code === 'kablovska-tv' || label.includes('kablovska')) {
            features.push('Kablovska TV')
          } else if (code === 'gara-a' || label.includes('garaža') || label.includes('garaza')) {
            features.push('Garaža')
          } else if (code === 'balkon' || label.includes('balkon') || label.includes('terasa')) {
            features.push('Balkon / Terasa')
          } else if (code === 'klima' || label.includes('klima')) {
            features.push('Klima uređaj')
          } else if (code === 'lift' || label.includes('lift')) {
            features.push('Lift')
          } else if (code === 'parking' || label.includes('parking')) {
            features.push('Parking mjesta')
          } else if (code === 'uknjizeno' || label.includes('uknjiž')) {
            features.push('Uknjiženo / Vlasništvo 1/1')
          }
        })

        // Description extraction
        let description = cleanOlxDescription(detailData?.additional?.description || item.description || '')
        if (!description) {
          description = `Nekretnina "${item.title}". Površina: ${areaSize} m², soba: ${bedrooms}, kupatila: ${bathrooms}. Automatski sinhronizovano sa OLX.ba profila.`
        }

        // Image extraction
        const rawImagesList: string[] = detailData?.images || item.images || [item.image]
        const imagesObjects = (rawImagesList || []).filter(Boolean).map((img: string, idx: number) => ({
          url: img,
          caption: `${item.title} - Slika ${idx + 1}`,
          order: idx
        }))

        // City mapping
        let city = 'Sarajevo'
        const lowerTitle = (item.title || '').toLowerCase()
        if (item.city_id === 39 || lowerTitle.includes('visoko')) city = 'Visoko'
        else if (lowerTitle.includes('mostar')) city = 'Mostar'
        else if (lowerTitle.includes('banja luka')) city = 'Banja Luka'
        else if (lowerTitle.includes('tuzla')) city = 'Tuzla'
        else if (lowerTitle.includes('zavidovići') || lowerTitle.includes('zavidovici')) city = 'Zavidovići'
        else if (lowerTitle.includes('zenica')) city = 'Zenica'

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
            cover_image_url: item.image || (imagesObjects[0]?.url || null),
            images: imagesObjects
          })
          .select('id, title, price, area_size, bedrooms')
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

      return NextResponse.json({
        success: true,
        message: `Sinhronizovano! Uvezeno ${imported.length} novih nekretnina sa OLX.ba.`,
        importedCount: imported.length,
        imported
      })
    }

    return NextResponse.json({ error: 'Unsupported sync direction' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
