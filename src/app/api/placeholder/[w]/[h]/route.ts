import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { w: string; h: string } }
) {
  const width = parseInt(params.w, 10) || 600
  const height = parseInt(params.h, 10) || 400

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f4f4f6"/>
  <g fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(${width / 2 - 18}, ${height / 2 - 24}) scale(1.5)">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </g>
  <text x="50%" y="${height / 2 + 28}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#71717a" text-anchor="middle">
    No Image Available
  </text>
</svg>`.trim()

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
