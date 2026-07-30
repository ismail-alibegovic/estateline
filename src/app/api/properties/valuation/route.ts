import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { calculatePropertyValuation } from '@/lib/valuation-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city') || 'Sarajevo'
    const type = searchParams.get('type') || 'apartment'
    const areaSize = parseFloat(searchParams.get('area_size') || '60')

    const { data, error } = await ctx.supabase.rpc('estimate_property_valuation', {
      p_org_id: ctx.org.id,
      p_city: city,
      p_type: type,
      p_area_size: areaSize,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data?.[0] || {} }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const body = await req.json().catch(() => ({}))
    const { city, type, area_size, bedrooms, bathrooms, year_built } = body

    if (!city || !area_size) {
      return NextResponse.json({ error: 'city and area_size are required fields' }, { status: 400 })
    }

    const estimate = calculatePropertyValuation({
      city,
      type: type || 'apartment',
      area_size: Number(area_size),
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      year_built: year_built ? Number(year_built) : undefined,
    })

    return NextResponse.json({ data: estimate }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
