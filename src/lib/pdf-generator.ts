import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface ContractFieldMapping {
  placeholder: string
  systemField: string
  label: string
}

export interface SystemVariables {
  // Contact / Client
  client_name?: string
  client_email?: string
  client_phone?: string
  client_address?: string
  client_id_number?: string

  // Property
  property_title?: string
  property_address?: string
  property_city?: string
  property_price?: string
  property_type?: string
  property_area?: string

  // Deal / Transaction
  deal_value?: string
  deposit_amount?: string
  closing_date?: string
  agency_commission?: string

  // Agency / Org
  agency_name?: string
  agency_address?: string
  agency_tax_id?: string
  agency_phone?: string
  agency_email?: string
}

export const SYSTEM_FIELDS_OPTIONS = [
  { value: 'client_name', label: 'Klijent: Ime i Prezime' },
  { value: 'client_email', label: 'Klijent: Email' },
  { value: 'client_phone', label: 'Klijent: Telefon' },
  { value: 'client_address', label: 'Klijent: Adresa / JMBG' },
  { value: 'client_id_number', label: 'Klijent: Broj Lične Karte' },
  { value: 'property_title', label: 'Nekretnina: Naziv' },
  { value: 'property_address', label: 'Nekretnina: Adresa' },
  { value: 'property_city', label: 'Nekretnina: Grad' },
  { value: 'property_price', label: 'Nekretnina: Cijena' },
  { value: 'property_type', label: 'Nekretnina: Tip' },
  { value: 'property_area', label: 'Nekretnina: Površina (m²)' },
  { value: 'deal_value', label: 'Ugovor: Ukupna Vrijednost' },
  { value: 'deposit_amount', label: 'Ugovor: Iznos Kapare' },
  { value: 'closing_date', label: 'Ugovor: Rok / Datum Zatvaranja' },
  { value: 'agency_commission', label: 'Ugovor: Agencijska Provizija' },
  { value: 'agency_name', label: 'Agencija: Naziv' },
  { value: 'agency_address', label: 'Agencija: Adresa' },
  { value: 'agency_tax_id', label: 'Agencija: JIB / ID Broj' },
]

/**
 * Scan raw text for placeholders matching `${placeholder}` or `{{placeholder}}`.
 */
export function extractPlaceholders(text: string): string[] {
  const matches = new Set<string>()
  const regex = /(\$\{([^}]+)\})|(\{\{([^}]+)\}\})/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const p = match[2] || match[4]
    if (p && p.trim()) {
      matches.add(p.trim())
    }
  }
  return Array.from(matches)
}

/**
 * Generate a PDF document from populated template content.
 */
export async function generateContractPdf(
  title: string,
  content: string,
  systemVars: SystemVariables
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const margin = 50

  let y = height - margin

  // Brand Header
  const agencyName = systemVars.agency_name || 'Estateline Real Estate'
  page.drawText(agencyName.toUpperCase(), {
    x: margin,
    y: y - 10,
    size: 14,
    font: fontBold,
    color: rgb(0.788, 0.588, 0.231), // #C9963B Gold accent
  })

  page.drawText('SLUŽBENI DOKUMENT / CONTRACT', {
    x: width - margin - 180,
    y: y - 10,
    size: 9,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  })

  y -= 30
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.82, 0.75),
  })

  y -= 40

  // Document Title
  page.drawText(title, {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  })

  y -= 35

  // Replace placeholders in content
  let populatedText = content
  Object.entries(systemVars).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      const p1 = `\${${key}}`
      const p2 = `{{${key}}}`
      populatedText = populatedText.split(p1).join(val).split(p2).join(val)
    }
  })

  // Format paragraphs
  const paragraphs = populatedText.split('\n')
  const fontSize = 10
  const lineHeight = 16

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      y -= lineHeight
      continue
    }

    // Split text into wrapped lines
    const words = paragraph.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (testWidth > width - margin * 2) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        })
        y -= lineHeight
        currentLine = word

        // Add new page if page boundary is reached
        if (y < margin + 100) {
          page = pdfDoc.addPage([595.28, 841.89])
          y = height - margin
        }
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      })
      y -= lineHeight
    }

    if (y < margin + 100) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = height - margin
    }
  }

  // Signature Block
  if (y < margin + 120) {
    page = pdfDoc.addPage([595.28, 841.89])
    y = height - margin
  }

  y -= 40
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })

  y -= 30
  // Left: Agency signature
  page.drawText('ZA AGENCIJU / FOR AGENCY:', {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  })
  page.drawLine({
    start: { x: margin, y: y - 40 },
    end: { x: margin + 180, y: y - 40 },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  })
  page.drawText('M.P. / Potpis ovlaštenog lica', {
    x: margin,
    y: y - 52,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })

  // Right: Client signature
  const rightX = width - margin - 180
  page.drawText('KLIJENT / CLIENT:', {
    x: rightX,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  })
  page.drawLine({
    start: { x: rightX, y: y - 40 },
    end: { x: rightX + 180, y: y - 40 },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  })
  page.drawText('Vlastoručni potpis kupca/prodavca', {
    x: rightX,
    y: y - 52,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
