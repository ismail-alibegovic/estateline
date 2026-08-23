import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext } from '@/lib/auth'
import { buildPreview, collectExistingKeys, readSheetFromRequest, MAX_IMPORT_ROWS } from '@/lib/import-server'

export async function POST(req: NextRequest) {
  const ctx = await getRouteContext()
  if (ctx instanceof Response) return ctx
  const { supabase } = ctx

  const parsed = await readSheetFromRequest(req)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  let existingKeys: Set<string>
  try {
    existingKeys = await collectExistingKeys(supabase, parsed.entity)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  const preview = buildPreview(parsed.entity, parsed.sheet, existingKeys)
  if (preview.summary.total > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `file has ${preview.summary.total} rows; limit is ${MAX_IMPORT_ROWS} per import` },
      { status: 413 }
    )
  }

  return NextResponse.json({
    entity: parsed.entity,
    headers: parsed.sheet.headers,
    ...preview,
    sampleRows: preview.rows.slice(0, 200),
    truncated: preview.summary.total > 200,
  })
}
