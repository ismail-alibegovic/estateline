import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError, WRITER_ROLES, requireRole } from '@/lib/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { generatePropertyDescription } from '@/lib/ai-service'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const denied = requireRole(ctx, WRITER_ROLES)
    if (denied) return denied
    const rl = await checkRateLimit(req, 10, 60 * 1000, `org:${ctx.org.id}`)
    if (!rl.success) return rateLimitResponse()

    const body = await req.json()

    if (!body.title || !body.type || typeof body.price !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters (title, type, price)' },
        { status: 400 }
      )
    }

    const result = await generatePropertyDescription({
      title: body.title,
      type: body.type,
      listing_type: body.listing_type,
      price: body.price,
      currency: body.currency || 'BAM',
      area_size: body.area_size,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      city: body.city,
      address: body.address,
      features: body.features,
      language: body.language || 'bs',
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
