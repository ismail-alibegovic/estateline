import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const connectionString = 'postgresql://postgres.vlkasfskndcmbrbbdvzd:Estateline2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

async function migrate() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  console.log('Connecting to database for Financials table migration...')
  await client.connect()
  console.log('Connected successfully.')

  const sql = `
    -- 1. Quotes Table
    CREATE TABLE IF NOT EXISTS public.quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
        contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
        property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
        category TEXT,
        amount NUMERIC,
        unit_price NUMERIC,
        account_name TEXT,
        account_number TEXT,
        swift_code TEXT,
        bank_name TEXT,
        bank_branch TEXT,
        description TEXT,
        created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'quotes_tenant_isolation'
      ) THEN
        CREATE POLICY quotes_tenant_isolation ON public.quotes
          FOR ALL
          USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1));
      END IF;
    END $$;

    -- 2. Quote Installments Table
    CREATE TABLE IF NOT EXISTS public.quote_installments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
        installment_number INTEGER NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        amount NUMERIC NOT NULL,
        percentage NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 3. Invoices Table
    CREATE TABLE IF NOT EXISTS public.invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        invoice_number TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
        contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        invoice_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        billing_street TEXT,
        billing_city TEXT,
        billing_state TEXT,
        billing_postal_code TEXT,
        billing_country TEXT,
        shipping_street TEXT,
        shipping_city TEXT,
        shipping_state TEXT,
        shipping_postal_code TEXT,
        shipping_country TEXT,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        tax NUMERIC DEFAULT 0,
        grand_total NUMERIC NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'BAM',
        payment_terms TEXT,
        description TEXT,
        created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_tenant_isolation'
      ) THEN
        CREATE POLICY invoices_tenant_isolation ON public.invoices
          FOR ALL
          USING (organization_id = (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1));
      END IF;
    END $$;

    -- 4. Invoice Items Table
    CREATE TABLE IF NOT EXISTS public.invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC NOT NULL DEFAULT 0,
        total NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `

  console.log('Running Financials schema updates...')
  await client.query(sql)
  console.log('Migration completed successfully!')

  await client.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
