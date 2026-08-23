import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRouteContext, isAuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ENTITIES = [
  'properties',
  'contacts',
  'leads',
  'deals',
  'viewings',
  'tasks',
  'communications',
] as const

type Entity = (typeof ENTITIES)[number]

const ROW_LIMIT = 50_000

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const lines = [columns.join(',')]
  for (const row of rows) {
    lines.push(columns.map(col => csvEscape(row[col])).join(','))
  }
  return lines.join('\r\n')
}

async function fetchEntity(
  supabase: SupabaseClient,
  entity: Entity
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from(entity)
    .select('*')
    .order('created_at', { ascending: true })
    .limit(ROW_LIMIT)
  if (error) throw new Error(`${entity}: ${error.message}`)
  return (data || []) as Record<string, unknown>[]
}

export async function GET(req: NextRequest) {
  // Export must remain available while an org is scheduled for deletion —
  // it IS the data-out path of the deletion lifecycle.
  const ctx = await getRouteContext({ allowScheduledForDeletion: true })
  if (isAuthError(ctx)) return ctx

  const url = new URL(req.url)
  const entityParam = url.searchParams.get('entity') || 'all'
  const format = url.searchParams.get('format') || 'json'
  const dateStamp = new Date().toISOString().slice(0, 10)

  if (!['json', 'csv'].includes(format)) {
    return NextResponse.json({ error: 'format must be json or csv' }, { status: 400 })
  }

  let entities: Entity[]
  if (entityParam === 'all') {
    entities = [...ENTITIES]
  } else if ((ENTITIES as readonly string[]).includes(entityParam)) {
    entities = [entityParam as Entity]
  } else {
    return NextResponse.json(
      { error: `entity must be one of: ${ENTITIES.join(', ')}, all` },
      { status: 400 }
    )
  }

  if (format === 'csv' && entities.length > 1) {
    return NextResponse.json(
      { error: 'csv format supports a single entity; use format=json with entity=all' },
      { status: 400 }
    )
  }

  try {
    const payload: Record<Entity, Record<string, unknown>[] | undefined> = {} as Record<Entity, Record<string, unknown>[]>
    for (const entity of entities) {
      payload[entity] = await fetchEntity(ctx.supabase, entity)
    }

    if (format === 'csv') {
      const rows = payload[entities[0]] || []
      return new NextResponse(toCsv(rows), {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="estateline-${entities[0]}-${dateStamp}.csv"`,
        },
      })
    }

    return new NextResponse(
      JSON.stringify(
        {
          organization: { id: ctx.org.id, name: ctx.org.name },
          exported_at: new Date().toISOString(),
          counts: Object.fromEntries(entities.map(e => [e, (payload[e] || []).length])),
          data: payload,
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': `attachment; filename="estateline-export-${dateStamp}.json"`,
        },
      }
    )
  } catch (err: any) {
    console.error('Export failed:', err.message)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
