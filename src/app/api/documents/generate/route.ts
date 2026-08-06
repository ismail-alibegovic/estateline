import { NextResponse } from 'next/server'
import { getRouteContext } from '@/lib/auth'
import { generateContractPdf, SystemVariables } from '@/lib/pdf-generator'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx instanceof Response) return ctx

    const {
      title,
      content,
      contact_id,
      property_id,
      deal_id,
      custom_values = {},
    } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const systemVars: SystemVariables = {
      agency_name: ctx.org.name,
      ...custom_values,
    }

    // Fetch Contact details if provided
    if (contact_id) {
      const { data: contact } = await ctx.supabase
        .from('contacts')
        .select('first_name, last_name, email, phone, address, notes')
        .eq('id', contact_id)
        .single()

      if (contact) {
        systemVars.client_name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        systemVars.client_email = contact.email || ''
        systemVars.client_phone = contact.phone || ''
        systemVars.client_address = contact.address || ''
      }
    }

    // Fetch Property details if provided
    if (property_id) {
      const { data: property } = await ctx.supabase
        .from('properties')
        .select('title, address, city, price, type, area_size')
        .eq('id', property_id)
        .single()

      if (property) {
        systemVars.property_title = property.title || ''
        systemVars.property_address = property.address || ''
        systemVars.property_city = property.city || ''
        systemVars.property_price = property.price ? `${property.price} KM` : ''
        systemVars.property_type = property.type || ''
        systemVars.property_area = property.area_size ? `${property.area_size} m²` : ''
      }
    }

    // Fetch Deal details if provided
    if (deal_id) {
      const { data: deal } = await ctx.supabase
        .from('deals')
        .select('title, price, stage, expected_closing_date, commission_amount')
        .eq('id', deal_id)
        .single()

      if (deal) {
        systemVars.deal_value = deal.price ? `${deal.price} KM` : ''
        systemVars.closing_date = deal.expected_closing_date || ''
        systemVars.agency_commission = deal.commission_amount ? `${deal.commission_amount} KM` : ''
      }
    }

    // Generate PDF Bytes
    const pdfBytes = await generateContractPdf(title, content, systemVars)

    // Save metadata record into database
    const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`
    
    const { data: docRecord, error: dbErr } = await ctx.supabase
      .from('documents')
      .insert({
        organization_id: ctx.org.id,
        title,
        type: 'contract',
        file_url: `/api/documents/generated/${fileName}`,
        metadata: {
          file_name: fileName,
          file_size: `${Math.round(pdfBytes.length / 1024)} KB`,
          contact_id,
          property_id,
          deal_id,
          status: 'draft',
        },
      })
      .select()
      .single()

    if (dbErr) {
      console.error('Error recording document to DB:', dbErr)
    }

    // Return generated PDF buffer for download / viewing
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Document-Id': docRecord?.id || '',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate contract PDF' }, { status: 500 })
  }
}
