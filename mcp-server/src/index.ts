#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const baseUrl = (process.env.ESTATELINE_URL ?? '').replace(/\/$/, '')
const apiKey = process.env.ESTATELINE_API_KEY ?? ''

if (!baseUrl || !apiKey.startsWith('est_live_')) {
  console.error('Set ESTATELINE_URL (e.g. https://your-app.example.com) and ESTATELINE_API_KEY (est_live_...).')
  process.exit(1)
}

async function get(path: string, params: Record<string, string | undefined> = {}) {
  const url = new URL(baseUrl + path)
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
  const text = await res.text()
  if (!res.ok) {
    return { isError: true as const, content: [{ type: 'text' as const, text: `Estateline returned ${res.status}: ${text}` }] }
  }
  return { content: [{ type: 'text' as const, text }] }
}

const dateRange = {
  start_date: z.string().optional().describe('ISO date, e.g. 2026-01-01'),
  end_date: z.string().optional().describe('ISO date, e.g. 2026-03-31'),
}

const server = new McpServer({ name: 'estateline', version: '0.1.0' })

server.tool(
  'dashboard_metrics',
  'Counts of properties, leads, contacts and upcoming viewings for the organization.',
  {},
  async () => get('/api/dashboard/metrics')
)

server.tool(
  'lead_conversion_report',
  'Leads broken down by source, status and stage, plus lost reasons.',
  dateRange,
  async (a) => get('/api/reports/lead-conversion', a)
)

server.tool(
  'agent_performance_report',
  'Closed deals, revenue, commission and viewings per agent.',
  { ...dateRange, assigned_to: z.string().optional().describe('Restrict to one agent id') },
  async (a) => get('/api/reports/agent-performance', a)
)

server.tool(
  'search',
  'Search properties, contacts, leads and deals by text.',
  { q: z.string().min(1).describe('Search text') },
  async (a) => get('/api/search', a)
)

await server.connect(new StdioServerTransport())
