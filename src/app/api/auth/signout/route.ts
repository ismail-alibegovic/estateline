import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
