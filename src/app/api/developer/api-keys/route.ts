import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function GET() {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, last_used_at, created_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: keys })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { name, permissions } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required for API key' }, { status: 400 })
    }

    // Generate random secret API key
    const rawSecret = `est_live_${crypto.randomBytes(24).toString('hex')}`
    const prefix = rawSecret.substring(0, 12)
    const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex')

    const { data: newKey, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: org.id,
        name,
        key_prefix: `${prefix}...`,
        key_hash: keyHash,
        permissions: permissions || ['read', 'write'],
      })
      .select('id, name, key_prefix, permissions, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return the raw Secret ONLY ONCE upon creation
    return NextResponse.json({
      success: true,
      data: newKey,
      secret_key: rawSecret, // Client must save this immediately
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('organization_id', org.id)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
