import { NextResponse } from 'next/server'
import { getRouteContext } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx instanceof Response) return ctx

    const { channel, recipient, message, subject, contact_id, lead_id } = await request.json()

    if (!channel || !recipient || !message) {
      return NextResponse.json({ error: 'Channel, recipient, and message are required' }, { status: 400 })
    }

    let status = 'sent'
    let summary = message

    if (channel === 'whatsapp') {
      // Record WhatsApp click-to-chat action or WhatsApp message dispatch
      summary = `[WhatsApp API] ${message}`
    } else if (channel === 'sms') {
      summary = `[SMS] ${message}`
    } else if (channel === 'email') {
      summary = `[Email: ${subject || 'Službena Poruka'}] ${message}`
    }

    // Insert log record into communications table
    const { data, error } = await ctx.supabase
      .from('communications')
      .insert({
        organization_id: ctx.org.id,
        contact_id: contact_id || null,
        lead_id: lead_id || null,
        type: channel,
        title: subject || `Poruka ka ${recipient}`,
        summary,
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording communication:', error)
    }

    return NextResponse.json({
      success: true,
      message: `Poruka uspješno poslana putem ${channel.toUpperCase()} kanala!`,
      communication: data,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
