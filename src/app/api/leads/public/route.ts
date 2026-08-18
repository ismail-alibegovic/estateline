import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req, 10, 60 * 1000)
  if (!rl.success) return rateLimitResponse()

  try {
    const body = await req.json()
    const organizationSlug = clean(body.organization_slug, 80).toLowerCase()
    const firstName = clean(body.first_name, 80)
    const lastName = clean(body.last_name, 80)
    const email = clean(body.email, 180).toLowerCase()
    const phone = clean(body.phone, 60)
    const message = clean(body.message, 1500)
    const propertyId = clean(body.property_id, 80)

    if (!organizationSlug || !firstName) {
      return NextResponse.json({ error: 'organization_slug and first_name are required' }, { status: 400 })
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    if (email && !emailPattern.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (propertyId && !uuidPattern.test(propertyId)) {
      return NextResponse.json({ error: 'Invalid property_id' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', organizationSlug)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (propertyId) {
      const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .eq('organization_id', org.id)
        .single()

      if (!property) {
        return NextResponse.json({ error: 'Property not found for this organization' }, { status: 404 })
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: org.id,
        source: 'website',
        status: 'open',
        stage: 'New',
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        phone: phone || null,
        requirements: message || null,
        property_id: propertyId || null,
        tags: ['public-lead-form'],
      })
      .select('id, first_name, last_name, email, phone, source, status, stage, property_id, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Could not create lead' }, { status: 500 })
    }

    return NextResponse.json({ success: true, organization: { name: org.name, slug: org.slug }, data })
  } catch {
    return NextResponse.json({ error: 'Invalid lead submission' }, { status: 500 })
  }
}
