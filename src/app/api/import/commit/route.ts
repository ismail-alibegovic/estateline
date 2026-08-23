import { NextRequest, NextResponse } from 'next/server'
import { getRouteContext } from '@/lib/auth'
import { buildPreview, collectExistingKeys, readSheetFromRequest } from '@/lib/import-server'

export async function POST(req: NextRequest) {
  const ctx = await getRouteContext()
  if (ctx instanceof Response) return ctx
  const { supabase, org, user } = ctx

  const parsed = await readSheetFromRequest(req)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }
  const { entity, sheet } = parsed

  let mode: 'skip' | 'insert' = 'skip'
  const modeRaw = String(req.nextUrl.searchParams.get('duplicates') || 'skip')
  if (modeRaw === 'insert') mode = 'insert'

  let existingKeys: Set<string>
  try {
    existingKeys = await collectExistingKeys(supabase, entity)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  const preview = buildPreview(entity, sheet, existingKeys)

  const toInsert: Record<string, unknown>[] = []
  const rowErrors: { rowNumber: number; errors: string[] }[] = []
  let skippedDuplicates = 0

  for (const r of preview.rows) {
    if (r.status === 'error') {
      rowErrors.push({ rowNumber: r.rowNumber, errors: r.errors })
      continue
    }
    if (r.status === 'duplicate' && mode === 'skip') {
      skippedDuplicates++
      continue
    }
    toInsert.push(r.values)
  }

  const inserted = toInsert.length
  if (inserted) {
    const table = entity === 'properties' ? 'properties' : entity
    for (let i = 0; i < toInsert.length; i += 250) {
      const batch = toInsert.slice(i, i + 250).map((v) => ({
        ...v,
        organization_id: org.id,
        created_by: user.id,
        ...(entity === 'properties'
          ? { slug: `${slugify(String(v.title || 'property'))}-${Math.random().toString(36).slice(2, 8)}` }
          : {}),
      }))
      const { error } = await supabase.from(table).insert(batch)
      if (error) {
        return NextResponse.json(
          { error: `batch ${i / 250 + 1} failed: ${error.message}; no rows from this batch were saved`, insertedBeforeFailure: i },
          { status: 500 }
        )
      }
    }
  }

  return NextResponse.json({
    entity,
    summary: {
      ...preview.summary,
      skippedDuplicates,
      failedRows: rowErrors.length,
      inserted,
    },
    rowErrors,
  })
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'nekretnina'
}
