# Estateline — Improvement Plan (post-81598e7 audit)

Status: `81598e7` (GitHub remote) — DOBAR KOD, NEVERIFIKOVAN. Lokalno: `45da362`.
Boje: warm cream prestige — zadržano. Nema purple/tech-dark.

## 1. Sync & Build (prioritet: blokira sve)
- `git pull origin master` → primeni `81598e7` lokalno
- `bun install` → zavisnosti (`pdf-lib`, `recharts`, `lucide-react`)
- `bun run build` → proveri 0 TypeScript grešaka (SOUL: verifikuj, ne veruj izveštaju)

## 2. Vizuelna verifikacija (SOUL.md: visual verification first)
- Otvoriti `https://sprypine.zo.space/estateline` i lokalno `localhost:3000`
- Proveriti: `dashboard/page.tsx`, `dashboard/reports/page.tsx`, `dashboard/onboarding/page.tsx`
- Screenshot svake stranice → sačuvati u `/home/workspace/estateline/verification/`

## 3. PDF Ugovor Editor (`file 'src/lib/pdf-generator.ts'`)
- Test: upload ugovora (`Ugovor o Posredovanju...`) u `templates/page.tsx`
- Proveriti: `extractPlaceholders()` detektuje `${client_name}`, `${property_price}` itd.
- Test generisanja: `POST /api/documents/generate` sa realnim `deal_id` iz Supabase
- Verifikovati izlazni PDF (A4, brand stil, potpisni blok)

## 4. Auth Middleware (`file 'src/middleware.ts'`)
- Proveriti: neautorizovan korisnik na `/dashboard` → redirect na `/login`
- Proveriti: `forgot-password/page.tsx` i `reset-password/page.tsx` funkcionišu
- Ako middleware ne blokira → popraviti pre deploy-a

## 5. Pipeline Settings (`file 'src/app/[locale]/dashboard/settings/pipeline/page.tsx'`)
- Proveriti: stage-ovi se čuvaju u `organizations.pipeline_stages`
- Proveriti: `DEFAULT_STAGES` (5 faza) se učitava iz baze, ne hardcoded

## 6. Uklanjanje DEMO podataka (prethodni commit `45da362` nije uklonio)
- `grep -rn "DEMO_" src/app/[locale]/dashboard/` → ukloniti sve `DEMO_PROPS`, `DEMO_CONTACTS`
- Zamena realnim `createBrowserClient` pozivima (već urađeno u `81598e7` — proveriti)

## 7. Recharts BI (`file 'src/app/[locale]/dashboard/reports/page.tsx'`)
- Proveriti: `BarChart`, `AreaChart` renderuju bez grešaka
- Proveriti: `useCurrency()` kontekst radi (formatiranje cena)
- Ako podaci prazni → dodati fallback poruku, ne praznu kartu

## 8. Dokumentacija i deploy
- Ažurirati `README.md` sa novim funkcionalnostima (PDF editor, pipeline settings, reports)
- `CHECKLIST.md`: označiti sve što je zaista testirano (ne pretpostavljati)
- Deploy: `zo space` restart (`service-doctor estateline`) nakon pull-a

## Sledeći korak (čeka eksplicitnu instrukciju)
`git pull origin master` — da počnem? Ili proveriti specifičan fajl (PDF, middleware, reports) prvo?
