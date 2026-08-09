# @ninots/mail

Mailer for Ninots — Laravel-inspired DX on Bun: **array** (tests), **log**, and **SMTP** via `Bun.connect` (no external runtime deps).

## Install

```bash
bun add @ninots/mail@^0.1.1
```

## API

| Export | Role |
|--------|------|
| `MailManager` | Resolve named mailers from config (`array` / `log` / `smtp`) |
| `Mailer` | `send` / `html` / `raw` + fluent `to` / `cc` / `bcc` |
| `PendingMail` | Recipient builder returned by `mailer.to(...)` |
| `ArrayTransport` | Collect messages in memory (tests) |
| `LogTransport` | Write readable dump via a logger callback |
| `SmtpTransport` | SMTP over `Bun.connect` (injectable `connect` for tests) |
| `Mailable` / `MailTransport` | Local contracts (zero `@ninots/*` deps) |

## Example

```ts
import { MailManager } from "@ninots/mail";

const mail = new MailManager({
  default: "array",
  from: { address: "noreply@example.com", name: "App" },
  mailers: {
    array: { driver: "array" },
    log: { driver: "log" },
    smtp: {
      driver: "smtp",
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { user: "user", pass: "pass" },
    },
  },
});

await mail.mailer().send({
  to: "you@example.com",
  subject: "Hello",
  text: "Hi from Ninots",
});
```

## Local MailDev (dev-only)

SMTP capture for integration tests uses [MailDev](https://github.com/maildev/maildev) via **Docker** (not an npm/runtime dependency).

```bash
# from this package root
docker compose up -d
# or: bun run maildev:up

bun test
# or: bun run test:maildev

docker compose down
# or: bun run maildev:down
```

- SMTP: `localhost:1025`
- Web UI / REST: `http://localhost:1080` (`GET /api/email`, `GET /api/healthz`)
- Integration tests skip if MailDev is not reachable

Optional agent MCP (`maildev --mcp` → `http://localhost:1080/mcp`) is documented in the hub only — not required for consumers.

## Version

`0.1.1` — Sprint 21: Mailer + array/log/SMTP; MailDev Docker harness for local SMTP tests.

## License

MIT

