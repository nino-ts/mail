/**
 * @ninots/mail — internal barrel.
 *
 * @packageDocumentation
 */

export {
    buildMailMessage,
    formatAddress,
    formatAddressList,
    toAddress,
    toAddressList,
} from "./address";
export { MailManager } from "./mail-manager";
export { Mailer } from "./mailer";
export { PendingMail } from "./pending-mail";
export { ArrayTransport } from "./transports/array-transport";
export { LogTransport } from "./transports/log-transport";
export type { LogTransportOptions } from "./transports/log-transport";
export {
    createBunSmtpConnection,
    SmtpTransport,
} from "./transports/smtp-transport";
export type {
    SmtpConnection,
    SmtpConnectionFactory,
    SmtpTransportOptions,
} from "./transports/smtp-transport";
export type {
    Address,
    Content,
    Envelope,
    Mailable,
    MailerConfig,
    MailerOptions,
    MailManagerConfig,
    MailMessage,
    MailTransport,
    SendOptions,
    SmtpConnectionLike,
} from "./types";
