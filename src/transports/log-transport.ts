/**
 * Log transport — writes a human-readable dump via a sink callback.
 *
 * @packageDocumentation
 */

import { formatAddress, formatAddressList } from "../address";
import type { MailMessage, MailTransport } from "../types";

/**
 * Options for {@link LogTransport}.
 */
export interface LogTransportOptions {
    logger?: (line: string) => void;
}

/**
 * Dev-friendly transport (Laravel `log` parity) without `@ninots/logger` dep.
 */
export class LogTransport implements MailTransport {
    private readonly logger: (line: string) => void;

    constructor(options: LogTransportOptions = {}) {
        this.logger = options.logger ?? ((line) => console.log(line));
    }

    public async send(message: MailMessage): Promise<void> {
        const lines = [
            "========== MAIL ==========",
            `From: ${formatAddress(message.from)}`,
            `To: ${formatAddressList(message.to)}`,
        ];
        if (message.cc.length > 0) {
            lines.push(`Cc: ${formatAddressList(message.cc)}`);
        }
        if (message.bcc.length > 0) {
            lines.push(`Bcc: ${formatAddressList(message.bcc)}`);
        }
        if (message.replyTo.length > 0) {
            lines.push(`Reply-To: ${formatAddressList(message.replyTo)}`);
        }
        lines.push(`Subject: ${message.subject}`);
        for (const [key, value] of Object.entries(message.headers)) {
            lines.push(`${key}: ${value}`);
        }
        lines.push("----------");
        if (message.text !== undefined && message.text.length > 0) {
            lines.push(message.text);
        }
        if (message.html !== undefined && message.html.length > 0) {
            lines.push(message.html);
        }
        lines.push("==========================");
        this.logger(lines.join("\n"));
    }
}
