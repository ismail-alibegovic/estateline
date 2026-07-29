import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

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
