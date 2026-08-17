export const supabaseEnv = {
  url:
    process.env.ESTATELINE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey:
    process.env.ESTATELINE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey:
    process.env.ESTATELINE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY,
}

export function requireSupabasePublicEnv() {
  if (!supabaseEnv.url || !supabaseEnv.anonKey) {
    throw new Error('Missing Supabase public environment variables')
  }

  return {
    url: supabaseEnv.url,
    anonKey: supabaseEnv.anonKey,
  }
}

export function requireSupabaseAdminEnv() {
  if (!supabaseEnv.url || !supabaseEnv.serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return {
    url: supabaseEnv.url,
    serviceRoleKey: supabaseEnv.serviceRoleKey,
  }
}
