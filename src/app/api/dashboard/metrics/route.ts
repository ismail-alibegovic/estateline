import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { data, error } = await ctx.supabase.rpc('get_dashboard_metrics', {
      p_org_id: ctx.org.id,
    })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
