# Supabase App Helpers

This folder contains the MealBoard Supabase client and auth helpers.

Task 02 added database migrations, RLS policies, and seed data under the root `supabase/` folder. Task 03 adds:

- `client.ts` for Client Component/browser Supabase access
- `server.ts` for Server Components, Server Actions, and route handlers
- `proxy.ts` for cookie-backed auth session refresh
- `household.ts` for fetching the current authenticated user's household membership

Expected environment variables are listed in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Only the public URL and anon key are used by app clients. The service-role key must stay out of browser code.
