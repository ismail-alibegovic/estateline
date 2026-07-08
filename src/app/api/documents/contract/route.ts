import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Field names below match the `properties` table as defined in
// supabase/migrations/002_properties_leads.sql:
//   type, area_size, bedrooms, bathrooms, currency, country
// (NOT the old property_type / listing_type / size_sqm / rooms names.)

export async function POST(req: NextRequest) {
  try {
    const { org_id, property_id, contact_id, deal_id } = await req.json()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: () => '', set: () => {}, remove: () => {} } }
    )

    // Fetch property details
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', org_id)
      .eq('id', property_id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Fetch contact details
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', org_id)
      .eq('id', contact_id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Fetch organization
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org_id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Build the contract PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const drawText = (text: string, x: number, y: number, size: number, isBold = false) => {
      const fontSize = size
      page.drawText(text, {
        x, y: height - y,
        size: fontSize,
        font: isBold ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      })
    }

    // Header
    drawText('REAL ESTATE CONTRACT', 50, 70, 20, true)
    drawText(`Contract ID: ${deal_id?.substring(0, 8) || 'N/A'}`, 50, 95, 10)
    drawText(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 110, 10)

    // Organization
    drawText('PARTIES', 50, 140, 14, true)
    drawText(`Seller/Agency: ${org.name}`, 50, 165, 11)
    drawText(`Buyer/Client: ${contact.first_name} ${contact.last_name || ''}`, 50, 180, 11)

    // Property — fields match 002_properties_leads.sql:
    //   type (property_type enum), area_size, bedrooms, bathrooms, currency, country
    drawText('PROPERTY DETAILS', 50, 215, 14, true)
    drawText(`Title: ${property.title}`, 50, 240, 11)
    drawText(`Type: ${property.type}`, 50, 255, 11)

    if (property.address) drawText(`Address: ${property.address}`, 50, 270, 11)
    if (property.city) drawText(`City: ${property.city}`, 50, 285, 11)
    if (property.country) drawText(`Country: ${property.country}`, 50, 300, 11)

    if (property.area_size) drawText(`Size: ${property.area_size} m²`, 50, 325, 11)
    if (property.bedrooms) drawText(`Bedrooms: ${property.bedrooms}`, 50, 340, 11)
    if (property.bathrooms) drawText(`Bathrooms: ${property.bathrooms}`, 50, 355, 11)
    if (property.year_built) drawText(`Year Built: ${property.year_built}`, 50, 370, 11)

    // Financial
    drawText('FINANCIAL DETAILS', 50, 405, 14, true)
    if (property.price) {
      drawText(`Price: ${property.price.toLocaleString()} ${property.currency}`, 50, 430, 12, true)
    }

    // Terms
    drawText('TERMS & CONDITIONS', 50, 475, 14, true)
    drawText('1. This contract is binding upon signature by both parties.', 50, 500, 10)
    drawText('2. All information provided is believed to be accurate.', 50, 515, 10)
    drawText('3. This document serves as a preliminary agreement.', 50, 530, 10)
    drawText('4. Legal review is recommended before final signing.', 50, 545, 10)

    // Signatures
    drawText('SIGNATURES', 50, 580, 14, true)
    drawText('Seller/Agency:', 50, 620, 11)
    drawText('Buyer/Client:', 300, 620, 11)

    // Signature lines
    page.drawLine({
      start: { x: 50, y: height - 660 },
      end: { x: 200, y: height - 660 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawLine({
      start: { x: 300, y: height - 660 },
      end: { x: 450, y: height - 660 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    })

    drawText('Date:', 50, 685, 10)
    drawText('Date:', 300, 685, 10)

    page.drawLine({
      start: { x: 50, y: height - 725 },
      end: { x: 200, y: height - 725 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawLine({
      start: { x: 300, y: height - 725 },
      end: { x: 450, y: height - 725 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    })

    // Footer
    drawText(`Generated by ${org.name} | Powered by Estateline`, 50, 810, 8)

    const pdfBytes = await pdfDoc.save()

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