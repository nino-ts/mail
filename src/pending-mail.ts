/**
 * Pending mail — fluent recipient builder.
 *
 * @packageDocumentation
 */

import type { Mailer } from "./mailer";
import type { Address, Mailable, SendOptions } from "./types";

/**
 * Chainable recipient builder returned by {@link Mailer.to}.
 */
export class PendingMail {
    private readonly mailer: Mailer;
    private readonly to: Array<Address | string>;
    private ccList: Array<Address | string> = [];
    private bccList: Array<Address | string> = [];

    constructor(mailer: Mailer, to: Address | string | Array<Address | string>) {
        this.mailer = mailer;
        this.to = Array.isArray(to) ? to : [to];
    }

    public cc(recipients: Address | string | Array<Address | string>): this {
        this.ccList = Array.isArray(recipients) ? recipients : [recipients];
        return this;
    }

    public bcc(recipients: Address | string | Array<Address | string>): this {
        this.bccList = Array.isArray(recipients) ? recipients : [recipients];
        return this;
    }

    public async send(mailable: Mailable): Promise<void> {
        const envelope = mailable.envelope();
        const content = mailable.content();
        await this.mailer.send({
            from: envelope.from,
            to: this.to,
            cc: this.ccList.length > 0 ? this.ccList : envelope.cc,
            bcc: this.bccList.length > 0 ? this.bccList : envelope.bcc,
            replyTo: envelope.replyTo,
            subject: envelope.subject,
            html: content.html,
            text: content.text,
            headers: envelope.headers,
        });
    }

    public async sendOptions(options: Omit<SendOptions, "to"> & { to?: SendOptions["to"] }): Promise<void> {
        await this.mailer.send({
            ...options,
            to: options.to ?? this.to,
            cc: options.cc ?? (this.ccList.length > 0 ? this.ccList : undefined),
            bcc: options.bcc ?? (this.bccList.length > 0 ? this.bccList : undefined),
        });
    }
}
