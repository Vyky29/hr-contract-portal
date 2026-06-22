# HR Contract Portal — clubSENsational

Internal portal for HR to prepare **Zero Hours** employment contracts. HR signs as director and sends a secure link; the employee signs online and downloads the completed PDF.

## Live

- **HR portal:** https://hr-contract-portal.vercel.app
- **Employee signing:** `https://hr-contract-portal.vercel.app/sign/{token}`
- **GitHub:** https://github.com/Vyky29/hr-contract-portal

## Workflow (Option 1)

1. **HR** — Steps 1–3: employee details, contract setup (director signature), review.
2. **HR** — Step 4: send contract ? stored in Supabase, invite email (optional).
3. **Employee** — Opens signing link, reviews contract, signs, downloads PDF.
4. **Emails** — Confirmation to employee and HR (when Resend is configured).

## Setup (first time)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL Editor.
3. Copy **Project URL** and **service_role** key (Settings ? API).

### 2. Resend (optional, for emails)

1. Create an account at [resend.com](https://resend.com).
2. Verify your sending domain.
3. Create an API key.

### 3. Vercel environment variables

In the Vercel project ? Settings ? Environment Variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SITE_URL` | `https://hr-contract-portal.vercel.app` |
| `RESEND_API_KEY` | Resend API key (optional) |
| `RESEND_FROM_EMAIL` | e.g. `HR Contract Portal <contracts@clubsensational.co.uk>` |
| `HR_EMAIL` | HR inbox for completion notifications |

Without Supabase, **Send to employee** will fail. Without Resend, contracts are still saved and you can copy the signing link manually.

### 4. Deploy

```bash
npm install
vercel --prod
```

## Local development

```bash
npm install
npx vercel dev
```

Use `vercel dev` so `/api/*` routes work locally. Plain `python3 -m http.server` only serves static files (preview only, no send/sign API).

## Project structure

```
index.html          HR portal (Steps 1–4)
sign.html           Employee signing page
js/contract-core.js Shared template & PDF logic
js/hr-app.js        HR workflow
js/sign-app.js      Employee signing
api/contracts/      Vercel serverless API
supabase/schema.sql Database schema
```

## Stack

- Static HTML/CSS + vanilla JavaScript
- Vercel serverless functions (Node.js)
- Supabase (Postgres)
- Resend (transactional email)
- html2pdf.js (employee PDF download)
