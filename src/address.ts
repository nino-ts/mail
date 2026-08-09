/**
 * Address helpers for @ninots/mail.
 *
 * @packageDocumentation
 */

import type { Address, MailMessage, SendOptions } from "./types";

/**
 * Normalize a string or Address into Address.
 */
export function toAddress(value: Address | string): Address {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            throw new Error("Email address must not be empty");
        }
        return { address: trimmed };
    }
    const address = value.address.trim();
    if (address.length === 0) {
        throw new Error("Email address must not be empty");
    }
    const name = value.name?.trim();
    return name !== undefined && name.length > 0 ? { address, name } : { address };
}

/**
 * Normalize one or many recipients.
 */
export function toAddressList(
    value: Address | string | Array<Address | string> | undefined,
): Address[] {
    if (value === undefined) {
        return [];
    }
    const items = Array.isArray(value) ? value : [value];
    return items.map(toAddress);
}

/**
 * Format an address for SMTP / log lines.
 */
export function formatAddress(address: Address): string {
    if (address.name !== undefined && address.name.length > 0) {
        return `${address.name} <${address.address}>`;
    }
    return address.address;
}

/**
 * Format a list of addresses joined by commas.
 */
export function formatAddressList(addresses: Address[]): string {
    return addresses.map(formatAddress).join(", ");
}

/**
 * Build a transport-ready {@link MailMessage}.
 */
export function buildMailMessage(options: SendOptions, defaultFrom: Address): MailMessage {
    const to = toAddressList(options.to);
    if (to.length === 0) {
        throw new Error("Mail message requires at least one recipient (to)");
    }
    if (
        (options.html === undefined || options.html.length === 0) &&
        (options.text === undefined || options.text.length === 0)
    ) {
        throw new Error("Mail message requires html and/or text body");
    }

    return {
        from: options.from !== undefined ? toAddress(options.from) : defaultFrom,
        to,
        cc: toAddressList(options.cc),
        bcc: toAddressList(options.bcc),
        replyTo: toAddressList(options.replyTo),
        subject: options.subject,
        ...(options.html !== undefined ? { html: options.html } : {}),
        ...(options.text !== undefined ? { text: options.text } : {}),
        headers: { ...(options.headers ?? {}) },
    };
}
