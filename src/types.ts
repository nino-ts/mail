/**
 * Local mail contracts for @ninots/mail (zero cross-package deps).
 *
 * @packageDocumentation
 */

/**
 * Email address with optional display name.
 */
export interface Address {
    address: string;
    name?: string;
}

/**
 * Normalized outbound message passed to transports.
 */
export interface MailMessage {
    from: Address;
    to: Address[];
    cc: Address[];
    bcc: Address[];
    replyTo: Address[];
    subject: string;
    html?: string;
    text?: string;
    headers: Record<string, string>;
}

/**
 * Envelope returned by {@link Mailable.envelope}.
 */
export interface Envelope {
    from?: Address | string;
    to: Address | string | Array<Address | string>;
    cc?: Address | string | Array<Address | string>;
    bcc?: Address | string | Array<Address | string>;
    replyTo?: Address | string | Array<Address | string>;
    subject: string;
    headers?: Record<string, string>;
}

/**
 * Body returned by {@link Mailable.content}.
 */
export interface Content {
    html?: string;
    text?: string;
}

/**
 * Domain object that builds an envelope + content.
 */
export interface Mailable {
    envelope(): Envelope;
    content(): Content;
}

/**
 * Transport seam.
 */
export interface MailTransport {
    send(message: MailMessage): Promise<void>;
}

/**
 * Per-mailer config for {@link MailManager}.
 */
export type MailerConfig =
    | { driver: "array" }
    | { driver: "log"; logger?: (line: string) => void }
    | {
          driver: "smtp";
          host: string;
          port: number;
          secure?: boolean;
          auth?: { user: string; pass: string };
          connect?: (options: { hostname: string; port: number; tls: boolean }) => Promise<SmtpConnectionLike>;
      };

/**
 * Minimal SMTP connection shape (shared with SmtpTransport).
 */
export interface SmtpConnectionLike {
    writeLine(line: string): Promise<void>;
    readResponse(): Promise<string>;
    close(): Promise<void>;
}

/**
 * Manager config.
 */
export interface MailManagerConfig {
    default: string;
    from: Address;
    mailers: Record<string, MailerConfig>;
}

/**
 * Raw send options.
 */
export interface SendOptions {
    from?: Address | string;
    to: Address | string | Array<Address | string>;
    cc?: Address | string | Array<Address | string>;
    bcc?: Address | string | Array<Address | string>;
    replyTo?: Address | string | Array<Address | string>;
    subject: string;
    html?: string;
    text?: string;
    headers?: Record<string, string>;
}

/**
 * Options for constructing a {@link Mailer}.
 */
export interface MailerOptions {
    name: string;
    transport: MailTransport;
    from: Address;
}
