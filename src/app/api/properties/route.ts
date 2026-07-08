import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const city = searchParams.get('city')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = ctx.supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('organization_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)
    if (city) query = query.ilike('city', `%${city}%`)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role === 'viewer')
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const body = await request.json()

    const { data, error } = await ctx.supabase
      .from('properties')
      .insert({
        organization_id: ctx.org.id,
        title: body.title,
        description: body.description,
        slug: body.slug,
        reference_number: body.reference_number,
        type: body.type || 'apartment',
        status: body.status || 'draft',
        price: body.price,
        currency: body.currency || ctx.org.name ? 'BAM' : 'BAM',
        price_period: body.price_period,
        address: body.address,
        city: body.city,
        state: body.state,
        country: body.country || 'BA',
        postal_code: body.postal_code,
        latitude: body.latitude,
        longitude: body.longitude,
        area_size: body.area_size,
        land_size: body.land_size,
        bedrooms: body.bedrooms || 0,
        bathrooms: body.bathrooms || 0,
        floors: body.floors || 1,
        year_built: body.year_built,
        parking_spaces: body.parking_spaces || 0,
        garage_spaces: body.garage_spaces || 0,
        features: body.features || [],
        cover_image_url: body.cover_image_url,
        images: body.images || [],
        video_url: body.video_url,
        virtual_tour_url: body.virtual_tour_url,
        energy_rating: body.energy_rating,
        featured: body.featured || false,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
