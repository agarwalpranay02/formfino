# FormFino release — 20 November 2026

Public app: https://formfino.vercel.app

Private source repository: https://github.com/agarwalpranay02/formfino

Analytics dashboard: https://vercel.com/thriver-02/formfino/analytics

## Delivered

- Independent Next.js 16.4.6 / React 19.2.6 application on Node 24, deployed to Vercel from the dedicated GitHub repository.
- Screenshot-to-requirements workflow, confirmation, local image/PDF preparation, previews and downloads; interactive PDF form filling; 69 PDF, image, text and structured-data tools.
- Responsive layout, self-hosted Source Sans 3 and Spectral fonts, keyboard navigation, native dialogs, light/dark themes and safe-area spacing.
- Installable web manifest with desktop/Android icons, Apple touch icon, installation instructions and a service worker with a bundled offline recovery screen. The app needs a connection to open the workspace and load processing tools; it does not store documents between sessions.
- Free Vercel Web Analytics enabled by the owner and verified through an accepted page-view request. Analytics sanitizes page URLs and respects Do Not Track / Global Privacy Control. Synthetic verification visits are not real users.
- Per-response CSP nonces, security headers, bounded processing inputs, local OCR assets with a pinned model checksum, production-disabled QA routes, GitHub Actions checks and automatic Vercel deployments.
- Git commit author: Pranay, associated with agarwalpranay02. No AI coauthor trailers. No other repository was modified.

## Verification evidence

| Check | Result |
| --- | --- |
| Unit tests, including PDF round trips, requirement parsing, limits, analytics privacy and offline recovery | 54 passed |
| Browser processing suite, including all 69 tools and regression cases | 91 passed, 0 failed in Chromium, Firefox and WebKit |
| Live responsive layout | Passed at 320, 390, 768, 1280, 1920 and 2560 px in Chrome 157, Firefox 159 and WebKit 27.2 |
| Live screenshot OCR → review → image preparation → download | Correct 200 × 230 JPG, under 50 KB in all three engines |
| Live fillable PDF → preview → download | Saved field value and Unicode filename verified in all three engines |
| Public routes / security headers | Nine serving checks passed, including write-method rejection and production QA 404s |
| Processing assets / fonts / install manifest / icon dimensions | Passed on public production URL |
| Chromium install eligibility / active service worker / offline screen | Passed in a separate normal test profile |
| Analytics request / sanitized URL / DNT / GPC | Passed on production |
| Production dependency audit | Zero known advisories reported at verification time |
| Vercel runtime error query | No errors returned in the checked 24-hour window |
| Firewall configuration | Vercel default firewall applies; no custom WAF rules configured |

The full processing suite uses generated fixtures on a development-only QA route. Live production verification exercises the core user workflows and responsive interface. These are distinct checks, not a claim that every possible user document was tested.

## Operating within free services

No paid database, OCR API, AI API, subscription or add-on was enabled. Current features require no Neon or Render service. GitHub Actions and Vercel remain subject to their free usage quotas.

Vercel Hobby permits personal/non-commercial use. This deployment is suitable for free evaluation; monetization requires a hosting arrangement whose terms permit it. No paid upgrade is authorized. Consult https://vercel.com/legal/terms and https://vercel.com/docs/analytics/limits-and-pricing before changing usage or billing.

## Practical limits

Browser-engine tests are not physical iPhone, iPad, Android or Mac installation tests. Safari-specific operating-system menus and downloads should still be checked on real devices. Large documents can exceed a device's memory despite the app's file-size limits. OCR is English-only and needs user confirmation. HEIC must be converted to an accepted JPEG, PNG or WebP input. Files are not retained across app restarts.

No independent penetration test or formal trademark/legal clearance has been performed. The custom domain has not been purchased; the public vercel.app address is free.
