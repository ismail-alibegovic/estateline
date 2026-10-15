import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext, isAuthError, WRITER_ROLES, requireRole } from '@/lib/auth'
import { generateContractPdf, type DocumentBranding, type SystemVariables } from '@/lib/pdf-generator'

// Field names below match the `properties` table as defined in
// supabase/migrations/002_properties_leads.sql:
//   type, area_size, bedrooms, bathrooms, currency, country
// (NOT the old property_type / listing_type / size_sqm / rooms names.)

export async function POST(req: NextRequest) {
  try {
    // Resolve the caller's org via auth + RLS. Never trust org_id from the
    // request body — a contract may only be generated for a property/contact
    // the authenticated user is permitted to see.
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const denied = requireRole(ctx, WRITER_ROLES)
    if (denied) return denied
    const { org, supabase } = ctx

    const { property_id, contact_id, deal_id } = await req.json()

    // Fetch property details (RLS-scoped to the user's org)
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', org.id)
      .eq('id', property_id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Fetch contact details (RLS-scoped)
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', org.id)
      .eq('id', contact_id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const systemVars: SystemVariables = {
      agency_name: org.name,
      client_name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
      property_title: property.title,
      property_address: property.address || '',
      property_city: property.city || '',
      property_type: property.type || '',
      property_area: property.area_size ? `${property.area_size} m²` : '',
      property_price: property.price ? `${property.price.toLocaleString()} ${property.currency}` : '',
      closing_date: new Date().toLocaleDateString('bs-BA'),
    }
    const content = [
      `Contract ID: ${deal_id?.substring(0, 8) || 'N/A'}`,
      `Date: ${systemVars.closing_date}`,
      '',
      'PARTIES',
      `Seller/Agency: ${org.name}`,
      `Buyer/Client: ${systemVars.client_name}`,
      '',
      'PROPERTY DETAILS',
      `Title: ${systemVars.property_title}`,
      `Type: ${systemVars.property_type}`,
      property.address ? `Address: ${property.address}` : '',
      property.city ? `City: ${property.city}` : '',
      property.country ? `Country: ${property.country}` : '',
      systemVars.property_area ? `Size: ${systemVars.property_area}` : '',
      '',
      'FINANCIAL DETAILS',
      systemVars.property_price ? `Price: ${systemVars.property_price}` : '',
      '',
      'TERMS & CONDITIONS',
      '1. This contract is binding upon signature by both parties.',
      '2. All information provided is believed to be accurate.',
      '3. This document serves as a preliminary agreement.',
      '4. Legal review is recommended before final signing.',
    ].join('\n')
    const branding = (org.branding || {}) as DocumentBranding
    const pdfBytes = await generateContractPdf('REAL ESTATE CONTRACT', content, systemVars, {
      ...branding,
      logo_url: branding.logo_url || org.logo_url,
    })

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${property_id}-${Date.now()}.pdf"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}