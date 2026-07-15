// Mock WebSocket to bypass Supabase Realtime initialization check on Node 20
globalThis.WebSocket = class DummyWebSocket {}

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load env variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanOlx() {
  console.log('Cleaning up OLX synced listings from the database...')
  
  // Find all property syndication links for OLX
  const { data: syns, error: synErr } = await supabase
    .from('property_syndications')
    .select('id, property_id, external_id')
    .eq('portal_name', 'olx')

  if (synErr) {
    console.error('Error fetching syndications:', synErr)
    return
  }

  console.log(`Found ${syns.length} OLX syndication links.`)

  if (syns.length === 0) {
    console.log('No listings to delete.')
    return
  }

  const propertyIds = syns.map(s => s.property_id).filter(Boolean)

  // Delete syndication links first
  const { error: delSynErr } = await supabase
    .from('property_syndications')
    .delete()
    .in('id', syns.map(s => s.id))

  if (delSynErr) {
    console.error('Error deleting syndications:', delSynErr)
    return
  }

  // Delete properties
  const { error: delPropErr } = await supabase
    .from('properties')
    .delete()
    .in('id', propertyIds)

  if (delPropErr) {
    console.error('Error deleting properties:', delPropErr)
    return
  }

  console.log(`Successfully deleted ${propertyIds.length} properties and their syndication links!`)
}

cleanOlx().catch(console.error)
