import { NextResponse } from 'next/server'
import { getRouteContext, isAuthError } from '@/lib/auth'
import { handleLeadStageTransition } from '@/lib/whatsapp-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    if (ctx.role === 'viewer')
      return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })

    const { leadId, newStage } = await request.json()
    if (!leadId || !newStage) {
      return NextResponse.json({ error: 'Missing leadId or newStage' }, { status: 400 })
    }

    await handleLeadStageTransition(ctx.org.id, leadId, newStage)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
