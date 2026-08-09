# Changelog

## 0.1.0 — 2026-08-09

- Initial release: `MailManager`, `Mailer`, `PendingMail`
- Transports: `array` (tests), `log`, `smtp` via `Bun.connect` (injectable connection)
- Zero external runtime deps; peer TypeScript `^7.0.0`; Bun-only; npm-only OIDC publish
