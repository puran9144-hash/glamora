# GLAMORA Founder Admin — Connected Starter

This is the GLAMORA founder/admin web application. It uses Next.js 15, React 19 and Supabase Auth/Postgres.

## Connected Supabase project

- Project: `GLAMORA`
- Region: `ap-south-1` (Mumbai)
- Project URL: `https://tgwnnygfzvjhtxupskbt.supabase.co`
- Founder sign-in is restricted to `founder` or `company_admin` rows in `public.user_roles`.

The public publishable key is safe to use in the browser. Never put a Supabase `service_role` or secret key in a `NEXT_PUBLIC_` variable or commit it to this folder.

## Run on Windows

1. Extract this ZIP to a normal folder, for example `C:\GLAMORA`.
2. Open that folder in VS Code or open Command Prompt in that folder (the folder containing `package.json`).
3. Copy `.env.example` to `.env.local`.
4. Check that `.env.local` contains the GLAMORA Project URL and publishable key. Do not add a service-role key.
5. Run:

   ```bash
   npm install
   npm run dev
   ```

6. Open `http://localhost:3000` in Chrome. Keep the terminal window running while you use the app.

## Founder password reset

- The Founder Login screen now has a **Forgot Password?** link.
- It sends a Supabase recovery email with redirect target `${SITE_URL}/reset-password` (the app uses the current website origin automatically).
- The `/reset-password` page accepts the recovery session and updates the password using Supabase Auth.
- In Supabase → Authentication → URL Configuration, keep Site URL set to `https://glamora-teal.vercel.app` and ensure Redirect URLs include `https://glamora-teal.vercel.app/**` (or the exact `/reset-password` URL).
- Deploy this updated project to Vercel before testing the reset link. Old emails generated before deployment may still point to the previous redirect; request a fresh reset email after deployment.

If the terminal shows `ENOENT package.json`, you are in the wrong folder. Use `cd /d "C:\path\to\glamora_supabase_connected"` first, then run `npm run dev`.

## Current connected admin features

- Supabase email/password sign-in and Founder/Company Admin role check.
- Live overview counts from the database.
- Seller application review and verification status changes.
- Product catalogue creation, editing, approval status and activate/deactivate control.
- Product categories create/edit.
- Store create/edit.
- Order status updates.
- Delivery status updates.
- Read-only customer profile, inventory, payment and employee-role views.
- Search within loaded records.

New products are created pending and inactive. Review product details before activating them. Seller approval should only happen after the business/KYC details are independently checked.

## Seed data already added to the connected database

- Cities: Chandigarh, Mohali and Panchkula.
- Starter artificial-jewellery categories: Earrings, Necklaces, Bangles, Bracelets, Rings, Hair Accessories and Bridal Jewellery.

## Important: not yet production-ready

This is an operational admin foundation, not the complete customer/seller/delivery platform. The following still require separate implementation and testing before public launch:

- Customer shopping website and Android/iOS apps.
- Seller registration portal and seller dashboard.
- Delivery partner app, location tracking and maps/ETA.
- Payment gateway integration, webhook verification, refunds and settlement reconciliation.
- OTP/SMS/email provider integration.
- Product image file upload and storage bucket policies (the product form currently accepts an image URL).
- Inventory receiving, transfers, reservations and stock adjustment workflow.
- Returns, cancellations, invoices, tax/GST calculations and finance exports.
- Employee invitations and secure role provisioning.
- MFA, rate limiting, backups, monitoring, audit review and production security testing.

Do not use this starter to accept live payments or promise 10–30 minute delivery until the required integrations and operations are in place.
