# FormFino

Prepare application photos, signatures and PDFs from a screenshot of upload requirements. Confirm the detected dimensions and byte limits, prepare files locally, preview them, and download a pack. Also includes interactive PDF form filling and 69 document, image, text and data tools.

Owned and maintained by Pranay Agarwal. Support: formfino@gmail.com.

## Run

Requires Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
node scripts/check-production.mjs http://127.0.0.1:3000
node scripts/check-serving.mjs http://127.0.0.1:3000
```

No database, file-upload API, external OCR API, or API key is required. Next.js serves the interface and local processing assets. PDF.js, pdf-lib, Tesseract, fflate and Papa Parse run on the user's device. The English OCR model, worker code and fonts are self-hosted. OCR results always require review.

## Deployment

Import this repository into Vercel as Next.js using Node 24. The included configuration pins install/build commands. Enable the project's free Web Analytics in the Vercel dashboard, then deploy the production branch. Analytics is mounted only when `VERCEL_ENV=production`. It sends sanitized page views, respects Do Not Track and Global Privacy Control, and excludes arbitrary paths, query strings, fragments, custom events and document data. No database provisioning is necessary.

Vercel Hobby is restricted to personal/non-commercial use. This free deployment is for evaluation; select a permitted plan before monetization. Check current provider terms and limits.

## Installation and supported devices

The web manifest, Android/desktop icons, Apple touch icon and in-app installation instructions support installation in compatible browsers. iPhone/iPad: Safari → Share → Add to Home Screen. Mac Safari: File → Add to Dock. Chrome/Edge: use the browser's install option. Browsers without installation support can use the website normally.

An internet connection is needed to open the workspace and load tools. The service worker includes a public offline explanation within its script and does not use Cache Storage. It never caches document contents or dynamically rendered pages. Work in progress is not restored after closing/reloading. Save downloads before leaving.

Use current Chrome, Edge, Firefox or Safari. Available memory and file formats differ by device; large PDFs may exceed a phone's memory even below a file-size limit. See **File limits** in the app. JPEG, PNG and WebP are accepted image inputs; HEIC should first be exported as JPEG/PNG. Device/browser testing does not prove universal compatibility.

## Security and verification

Per-request CSP nonces protect inline bootstrap scripts; document content is processed locally. Upload size, dimensions, page counts, ZIP names and structured input are bounded. The production app rejects unsupported write methods and hides development QA routes. Vercel supplies TLS and platform DDoS protection; account configuration must be verified separately.

Unit tests cover parsers, limits, file validation, PDF form round trips, analytics privacy and service-worker boundaries. `/qa` offers the browser processing regression suite in development only. `/qa/mobile` offers responsive checks in development only. These are not exposed by production builds. Review `RELEASE.md` for checks actually run on this release; tests are not a security certification.

## Rights

Original application source and design © 2026 Pranay Agarwal. All rights reserved unless separately licensed. Third-party software keeps its own licenses; see `public/THIRD_PARTY_NOTICES.txt` and font licenses in `public/fonts`. The name has not received formal trademark clearance.
