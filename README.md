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

Then deploy. Audio files use short-lived Azure SAS URLs and bypass Vercel functions, so large uploads are not constrained by Vercel's request-body limit.

## Azure CORS for audio uploads

Audio files upload directly from the browser to Azure with a short-lived, write-only SAS URL, avoiding Vercel's request-size limit. The app safely adds its own exact deployment origin to the Blob Service CORS configuration before the first upload while preserving existing rules.

If the storage account already has Azure's maximum of five CORS rules, open the Storage Account in the Azure portal, then **Resource sharing (CORS) → Blob service**, and add:

- Allowed origins: your Vercel URL, for example `https://q-sound-blush.vercel.app`
- Allowed methods: `PUT`, `OPTIONS`
- Allowed headers: `content-type`, `x-ms-blob-type`
- Exposed headers: `etag`, `x-ms-request-id`
- Max age: `3600`

Add `http://localhost:3000` as another origin when testing locally. Do not use `*` for the production origin.
"# QSound" 
