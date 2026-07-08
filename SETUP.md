# Estateline Setup Guide

## ✅ Step 1: Supabase Connection (DONE)

You've successfully connected your Supabase project:
- **Project URL**: `https://vlkasfskndcmbrbbdvzd.supabase.co`
- **Environment variables** stored in `.env.local` and Zo Secrets

## 📋 Step 2: Apply Database Schema

Run this SQL in your Supabase SQL Editor to create all tables, RLS policies, and the atomic signup function:

```sql
-- Copy entire contents of supabase/migrations/001_initial_schema.sql
```

**File location**: `file 'supabase/migrations/001_initial_schema.sql'`

## 🚀 Step 3: Start Development

```bash
cd estateline
npm run dev
```

The app will be available at `http://localhost:3000`

## 🧪 Step 4: Test Atomic Signup

1. Go to `http://localhost:3000`
2. Fill in the signup form:
   - Full name
   - Email
   - Password
   - Organization name (auto-generates slug)
3. Submit

The system will:
- Create auth user
- Create organization + user profile + membership **atomically**
- Roll back everything if any step fails
- Redirect to dashboard on success

## 🔐 Security Features Active

✅ **Row Level Security (RLS)** on all tables  
✅ **Atomic org signup** - no orphaned users  
✅ **Authorization checks** in RPC functions  
✅ **Partial unique index** - one primary org per user  
✅ **Service role key** stored securely in Zo Secrets

## 📁 Project Structure

```
estateline/
├── src/
│   ├── app/
│   │   ├── api/auth/
│   │   │   ├── signup/route.ts    # Atomic org signup API
│   │   │   ├── signin/route.ts    # Login
│   │   │   └── signout/route.ts   # Logout
│   │   ├── dashboard/page.tsx      # Main CRM dashboard
│   │   ├── login/page.tsx          # Login/signup page
│   │   └── layout.tsx              # Root layout
│   ├── lib/
│   │   └── supabase.ts             # Supabase client + types
│   └── middleware.ts               # Auth route protection
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Complete DB schema
├── .env.local                      # Supabase credentials
├── ARCHITECTURE.md                 # Technical deep dive
├── SECURITY.md                     # Security analysis
└── README.md                       # Project overview
```

## 🎯 Next Steps (Phase 1 - Auth + Onboarding)

After schema is applied, we'll build:

1. **Email confirmation** flow
2. **Organization onboarding** wizard
3. **User profile** management
4. **Invite team members** functionality
5. **Role-based permissions** (admin/agent/viewer)

## 🛠️ Available Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
```

## 📞 Support

- Documentation: `ARCHITECTURE.md`, `SECURITY.md`
- Database schema: `supabase/migrations/001_initial_schema.sql`
- Supabase Dashboard: https://vlkasfskndcmbrbbdvzd.supabase.co

---

**Status**: ✅ Supabase connected, project scaffolded, ready for development.