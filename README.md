# HR Contract Portal — clubSENsational

Standalone internal portal for HR to create, review, sign and generate **Zero Hours** employment contracts.

## Live

Deployed on Vercel (see deployment URL in project settings).

## Local preview

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`

## Stack

- Single HTML file (`index.html`) with embedded CSS and JavaScript
- [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) via CDN for PDF export
- `localStorage` for recent contract metadata (V1)

## Deploy

```bash
vercel --prod
```

## Future

Supabase integration planned for PDF storage, audit trail, and email notifications.
