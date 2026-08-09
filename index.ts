/**
 * @ninots/mail — Laravel-inspired mailer for Bun.
 *
 * @packageDocumentation
 */

export {
    ArrayTransport,
    buildMailMessage,
    createBunSmtpConnection,
    formatAddress,
    formatAddressList,
    LogTransport,
    Mailer,
    MailManager,
    PendingMail,
    SmtpTransport,
    toAddress,
    toAddressList,
} from "./src";
export type {
    Address,
    Content,
    Envelope,
    LogTransportOptions,
    Mailable,
    MailerConfig,
    MailerOptions,
    MailManagerConfig,
    MailMessage,
    MailTransport,
    SendOptions,
    SmtpConnection,
    SmtpConnectionFactory,
    SmtpConnectionLike,
    SmtpTransportOptions,
} from "./src";
