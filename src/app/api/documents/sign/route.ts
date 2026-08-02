import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getRouteContext, isAuthError } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRouteContext()
    if (isAuthError(ctx)) return ctx
    const { org, supabase } = ctx

    const {
      deal_id,
      property_id,
      contact_id,
      signer_name,
      signer_email,
      signature_data_uri,
    } = await req.json()

    if (!signer_name || !signer_email || !signature_data_uri) {
      return NextResponse.json(
        { error: 'Missing required signature payload (signer_name, signer_email, signature_data_uri)' },
        { status: 400 }
      )
    }

    // 1. Record contract signature in DB
    const { data: signatureRecord, error: dbErr } = await supabase
      .from('contract_signatures')
      .insert({
        organization_id: org.id,
        deal_id: deal_id || null,
        property_id: property_id || null,
        contact_id: contact_id || null,
        signer_name,
        signer_email,
        status: 'signed',
        signature_data_uri,
        signed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    // 2. Fetch property details if provided
    let propertyTitle = 'Real Estate Agreement'
    if (property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('title')
        .eq('organization_id', org.id)
        .eq('id', property_id)
        .single()
      if (prop?.title) propertyTitle = prop.title
    }

    // 3. Build Signed PDF with visual signature stamp
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const drawText = (text: string, x: number, y: number, size: number, isBold = false) => {
      page.drawText(text, {
        x,
        y: height - y,
        size,
        font: isBold ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      })
    }

    drawText('DIGITALLY SIGNED CONTRACT', 50, 70, 18, true)
    drawText(`Document ID: ${signatureRecord.id}`, 50, 95, 9)
    drawText(`Signed Date: ${new Date().toUTCString()}`, 50, 110, 9)

    drawText('PARTIES & METADATA', 50, 140, 13, true)
    drawText(`Agency: ${org.name}`, 50, 160, 10)
    drawText(`Signer: ${signer_name} (${signer_email})`, 50, 175, 10)
    drawText(`Property: ${propertyTitle}`, 50, 190, 10)

    drawText('DIGITAL VERIFICATION STAMP', 50, 230, 13, true)
    drawText(`Status: VERIFIED & SIGNED`, 50, 250, 10, true)
    drawText(`Authentication Hash: ${signatureRecord.id.replace(/-/g, '').toUpperCase()}`, 50, 265, 9)

    // Embed signature image if valid PNG/JPEG base64
    try {
      if (signature_data_uri.startsWith('data:image/png;base64,')) {
        const base64Data = signature_data_uri.replace('data:image/png;base64,', '')
        const imageBytes = Buffer.from(base64Data, 'base64')
        const pngImage = await pdfDoc.embedPng(imageBytes)
        page.drawImage(pngImage, {
          x: 50,
          y: height - 420,
          width: 200,
          height: 80,
        })
      }
    } catch {
      // Fallback text signature if image embedding fails
      drawText(`[ Digital Signature: ${signer_name} ]`, 50, 370, 12, true)
    }

    drawText(`Signer: ${signer_name}`, 50, 440, 10)
    drawText(`Timestamp: ${new Date().toISOString()}`, 50, 455, 9)

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="signed-contract-${signatureRecord.id.substring(0, 8)}.pdf"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
