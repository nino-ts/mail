# @ninots/mail

Mailer for Ninots — Laravel-inspired DX on Bun: **array** (tests), **log**, and **SMTP** via `Bun.connect` (no external runtime deps).

## Install

```bash
bun add @ninots/mail@^0.1.0
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

## Version

`0.1.0` — Sprint 21: Mailer + array/log/SMTP transports.

## License

MIT
