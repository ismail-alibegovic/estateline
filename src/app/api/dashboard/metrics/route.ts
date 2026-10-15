import { NextRequest, NextResponse } from 'next/server'
import { getReadContext } from '@/lib/api-key-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getReadContext(request)
    if (ctx instanceof Response) return ctx

    const { data, error } = await ctx.supabase.rpc('get_dashboard_metrics', {
      p_org_id: ctx.org.id,
    })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
