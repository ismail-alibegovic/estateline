import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('start_date') || null
    const endDate = searchParams.get('end_date') || null

    const { data, error } = await ctx.supabase.rpc('get_lead_conversion_report', {
      p_org_id: ctx.org.id,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      console.error('Error fetching lead conversion report RPC:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        data: data || {
          by_source: [],
          by_status: [],
          by_stage: [],
          lost_reasons: [],
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Unexpected error in lead conversion report endpoint:', error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
