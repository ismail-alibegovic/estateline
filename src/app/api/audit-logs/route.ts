import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { searchParams } = new URL(req.url)
    const entity_type = searchParams.get('entity_type')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (entity_type) {
      query = query.eq('entity_type', entity_type)
    }

    if (action) {
      query = query.eq('action', action)
    }

    const { data: logs, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: logs || [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
