import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createRouteClient } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password, fullName, orgName, orgSlug } = await request.json()

    // Validate input
    if (!email || !password || !fullName || !orgName || !orgSlug) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(orgSlug)) {
      return NextResponse.json(
        { error: 'Organization slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Step 1: Check slug availability FIRST (before creating auth user)
    const { data: existing } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This organization name is already taken. Please choose another.' },
        { status: 409 }
      )
    }

    // Step 2: Create auth user via Admin API
    console.log('Creating auth user:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    // Step 3: Atomic org creation via RPC (single transaction)
    console.log('Creating organization:', orgName, 'for user:', authData.user.id)
    const { error: rpcError } = await supabaseAdmin.rpc('create_organization', {
      p_org_name: orgName,
      p_org_slug: orgSlug,
      p_full_name: fullName,
      p_auth_user_id: authData.user.id,
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      // Clean up orphaned auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      if (rpcError.message.includes('already taken')) {
        return NextResponse.json(
          { error: 'This organization name is already taken. Please choose another.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: rpcError.message },
        { status: 400 }
      )
    }

    // Step 4: Create session for the user
    const supabaseRoute = createRouteClient()
    const { data: sessionData, error: sessionError } = await supabaseRoute.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError || !sessionData.session) {
      // User was created successfully but session failed
      // They can log in manually
      return NextResponse.json({
        success: true,
        message: 'Account created. Please log in.',
        user: { email },
      })
    }

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      session: sessionData.session,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during signup' },
      { status: 500 }
    )
  }
}
