import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = ctx.supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('organization_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (stage) query = query.eq('stage', stage)
    if (status) query = query.eq('status', status)

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

    const body = await request.json()

    const { data, error } = await ctx.supabase
      .from('leads')
      .insert({
        organization_id: ctx.org.id,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        stage: body.stage || 'New',
        source: body.source || 'manual',
        status: body.status || 'open',
        assigned_to: body.assigned_to,
        property_id: body.property_id,
        budget_min: body.budget_min,
        budget_max: body.budget_max,
        requirements: body.requirements,
        rating: body.rating,
        tags: body.tags || [],
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
