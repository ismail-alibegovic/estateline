import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { DEJAVU_SANS_BASE64, DEJAVU_SANS_BOLD_BASE64 } from './fonts-data'

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export interface ContractFieldMapping {
  placeholder: string
  systemField: string
  label: string
}

export interface SystemVariables {
  client_name?: string
  client_email?: string
  client_phone?: string
  client_address?: string
  client_jmbg?: string
  client_lk_number?: string
  property_name?: string
  property_address?: string
  property_city?: string
  property_price?: string
  property_type?: string
  property_area?: string
  contract_value?: string
  contract_deposit?: string
  contract_deadline?: string
  contract_commission?: string
  agency_name?: string
  agency_address?: string
  agency_jib?: string
  [key: string]: string | undefined
}

export const SYSTEM_FIELDS_OPTIONS = [
  { value: 'client_name', label: 'Klijent: Ime i Prezime' },
  { value: 'client_email', label: 'Klijent: Email' },
  { value: 'client_phone', label: 'Klijent: Telefon' },
  { value: 'client_address', label: 'Klijent: Adresa / JMBG' },
  { value: 'client_lk_number', label: 'Klijent: Broj Lične Karte' },
  { value: 'property_name', label: 'Nekretnina: Naziv' },
  { value: 'property_address', label: 'Nekretnina: Adresa' },
  { value: 'property_city', label: 'Nekretnina: Grad' },
  { value: 'property_price', label: 'Nekretnina: Cijena' },
  { value: 'property_type', label: 'Nekretnina: Tip' },
  { value: 'property_area', label: 'Nekretnina: Površina (m²)' },
  { value: 'contract_value', label: 'Ugovor: Vrijednost' },
  { value: 'contract_deposit', label: 'Ugovor: Iznos Kapare' },
  { value: 'contract_deadline', label: 'Ugovor: Rok Realizacije' },
  { value: 'contract_commission', label: 'Ugovor: Provizija Agencije' },
  { value: 'agency_name', label: 'Agencija: Naziv' },
  { value: 'agency_address', label: 'Agencija: Adresa' },
  { value: 'agency_jib', label: 'Agencija: JIB / ID Broj' },
]

const SYSTEM_LABELS: Record<string, string> = {}
SYSTEM_FIELDS_OPTIONS.forEach((f) => {
  SYSTEM_LABELS[f.value] = f.label
})

export function extractPlaceholders(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = new Set<string>()
  let match
  while ((match = regex.exec(template)) !== null) {
    matches.add(match[1].trim())
  }
  return Array.from(matches)
}

export async function generateContractPdf(
  title: string,
  content: string,
  systemVars: SystemVariables
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const fontBytes = b64ToBytes(DEJAVU_SANS_BASE64)
  const fontBoldBytes = b64ToBytes(DEJAVU_SANS_BOLD_BASE64)

  const font = await pdfDoc.embedFont(fontBytes)
  const fontBold = await pdfDoc.embedFont(fontBoldBytes)

  let page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const margin = 50

  let y = height - margin

  const agencyName = systemVars.agency_name || 'Estateline Real Estate'
  page.drawText(agencyName.toUpperCase(), {
    x: margin,
    y: y - 10,
    size: 14,
    font: fontBold,
    color: rgb(0.788, 0.588, 0.231),
  })

  y -= 50

  page.drawText(title, {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  y -= 35

  const lineY = y + 5
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: width - margin, y: lineY },
    thickness: 1,
    color: rgb(0.788, 0.588, 0.231),
  })

  y -= 25

  const lines = content.split('\n')
  const fontSize = 10.5
  const lineHeight = 18

  const headerPattern = /^(I{1,5}[.)]\s|[\d]+[.)]\s|[A-ZČĆŠĐŽ]{2,})/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (y < margin + 30) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = height - margin
    }

    if (line.trim() === '') {
      y -= 8
      continue
    }

    const isHeader = headerPattern.test(line.trim())
    const currentFont = isHeader ? fontBold : font
    const currentSize = isHeader ? 12 : fontSize
    const currentColor = isHeader ? rgb(0.1, 0.1, 0.1) : rgb(0.25, 0.25, 0.25)

    const words = line.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = currentFont.widthOfTextAtSize(testLine, currentSize)

      if (testWidth > width - margin * 2 && currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: currentSize,
          font: currentFont,
          color: currentColor,
        })
        y -= lineHeight
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y,
        size: currentSize,
        font: currentFont,
        color: currentColor,
      })
      y -= lineHeight
    }
  }

  y -= 20

  if (y < 80) {
    page = pdfDoc.addPage([595.28, 841.89])
    y = height - margin
  }

  const footerY = y
  page.drawLine({
    start: { x: margin, y: footerY },
    end: { x: width - margin, y: footerY },
    thickness: 0.5,
    color: rgb(0.788, 0.588, 0.231),
  })

  y -= 20

  page.drawText('Potpis Prodavca: _________________________', {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  page.drawText('Potpis Kupca: ___________________________', {
    x: width / 2,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  y -= 25

  const date = new Date().toLocaleDateString('bs-BA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  page.drawText(`Datum: ${date}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })

  page.drawText('Estateline — Vaš Partner u Nekretninama', {
    x: width - margin - 200,
    y,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })

  return pdfDoc.save()
}
