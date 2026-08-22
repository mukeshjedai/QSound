# QSound

An Audible-inspired personal audiobook library built with Next.js. Create books, upload audio chapters, loop a chapter, or continue automatically to the next one.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your Azure Storage connection string and preferred container name.
3. Run `npm install`, then `npm run dev`.

The app creates the Azure container and `data/books.json` index automatically. Audio stays in a private container and is streamed through the app.

## Deploy to Vercel

Import the repository in Vercel and add these Environment Variables:

- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER` (optional; defaults to `qsound`)

Then deploy. For large audio files, review your Vercel plan's request body and function duration limits. A future production-scale version should use short-lived Azure SAS URLs for direct browser uploads.
"# QSound" 
