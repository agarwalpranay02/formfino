# Security

Report suspected vulnerabilities privately to formfino@gmail.com. Do not attach identity documents or sensitive original files. Include the affected tool, browser/version, reproducible steps and a redacted sample where possible.

The app has no file-upload endpoint or database. Files are held in browser memory. Downloaded results persist on the user's device. Preferences and recent tool names use localStorage. Vercel processes hosting requests and sanitized analytics on production deployments.

Security controls include production CSP nonces, restricted origins, disabled object embeds/framing, MIME and content checks, bounded file/page/pixel limits, output-name sanitization, and spreadsheet formula escaping. Build dependencies are locked. No CI credentials are stored in this repository. Provider DDoS protection, account MFA and repository access controls are separate account-level responsibilities.

Run `pnpm audit --prod` and the release checks before updates. Inspect differences before changing dependencies. The app does not guarantee recovery of corrupted documents, removal of all metadata, OCR accuracy or acceptance by a form issuer. No independent penetration test has been performed.
