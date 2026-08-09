/**
 * Mailer — send raw options or a {@link Mailable}.
 *
 * @packageDocumentation
 */

import { buildMailMessage } from "./address";
import { PendingMail } from "./pending-mail";
import type { Address, Mailable, MailerOptions, MailTransport, SendOptions } from "./types";

/**
 * Sends messages through a single transport with a global From.
 */
export class Mailer {
    public readonly name: string;
    private readonly transport: MailTransport;
    private readonly from: Address;

    constructor(options: MailerOptions) {
        this.name = options.name;
        this.transport = options.transport;
        this.from = options.from;
    }

    /**
     * Global From address for this mailer.
     */
    public getFrom(): Address {
        return this.from;
    }

    /**
     * Underlying transport (useful for ArrayTransport assertions).
     */
    public getTransport(): MailTransport {
        return this.transport;
    }

    /**
     * Start a fluent recipient chain.
     */
    public to(recipients: Address | string | Array<Address | string>): PendingMail {
        return new PendingMail(this, recipients);
    }

    /**
     * Send a mailable or raw {@link SendOptions}.
     */
    public async send(mailableOrOptions: Mailable | SendOptions): Promise<void> {
        if (isMailable(mailableOrOptions)) {
            const envelope = mailableOrOptions.envelope();
            const content = mailableOrOptions.content();
            await this.send({
                ...(envelope.from !== undefined ? { from: envelope.from } : {}),
                to: envelope.to,
                ...(envelope.cc !== undefined ? { cc: envelope.cc } : {}),
                ...(envelope.bcc !== undefined ? { bcc: envelope.bcc } : {}),
                ...(envelope.replyTo !== undefined ? { replyTo: envelope.replyTo } : {}),
                subject: envelope.subject,
                ...(content.html !== undefined ? { html: content.html } : {}),
                ...(content.text !== undefined ? { text: content.text } : {}),
                ...(envelope.headers !== undefined ? { headers: envelope.headers } : {}),
            });
            return;
        }

        const message = buildMailMessage(mailableOrOptions, this.from);
        await this.transport.send(message);
    }

    /**
     * Convenience: HTML body.
     */
    public async html(
        to: Address | string | Array<Address | string>,
        subject: string,
        html: string,
    ): Promise<void> {
        await this.send({ to, subject, html });
    }

    /**
     * Convenience: plain-text body.
     */
    public async raw(
        to: Address | string | Array<Address | string>,
        subject: string,
        text: string,
    ): Promise<void> {
        await this.send({ to, subject, text });
    }
}

function isMailable(value: Mailable | SendOptions): value is Mailable {
    return (
        typeof value === "object" &&
        value !== null &&
        "envelope" in value &&
        "content" in value &&
        typeof value.envelope === "function" &&
        typeof value.content === "function"
    );
}
