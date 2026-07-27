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
    const assignedTo = searchParams.get('assigned_to') || null

    const { data, error } = await ctx.supabase.rpc('get_agent_performance_report', {
      p_org_id: ctx.org.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_agent_id: assignedTo,
    })

    if (error) {
      console.error('Error fetching agent performance report RPC:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] }, { status: 200 })
  } catch (error: any) {
    console.error('Unexpected error in agent performance report endpoint:', error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
