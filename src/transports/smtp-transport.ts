/**
 * SMTP transport — line protocol over an injectable connection (Bun or mock).
 *
 * @packageDocumentation
 */

import { formatAddress, formatAddressList } from "../address";
import type { MailMessage, MailTransport } from "../types";

/**
 * Line-oriented SMTP connection (mockable in tests).
 */
export interface SmtpConnection {
    writeLine(line: string): Promise<void>;
    readResponse(): Promise<string>;
    close(): Promise<void>;
}

/**
 * Factory that opens an SMTP connection.
 */
export type SmtpConnectionFactory = (options: {
    hostname: string;
    port: number;
    tls: boolean;
}) => Promise<SmtpConnection>;

/**
 * Options for {@link SmtpTransport}.
 */
export interface SmtpTransportOptions {
    host: string;
    port: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
    /**
     * Injectable connection factory. Defaults to Bun TCP/TLS sockets.
     */
    connect?: SmtpConnectionFactory;
}

/**
 * Deliver mail via SMTP (EHLO, optional AUTH LOGIN, MAIL/RCPT/DATA).
 */
export class SmtpTransport implements MailTransport {
    private readonly host: string;
    private readonly port: number;
    private readonly secure: boolean;
    private readonly auth: { user: string; pass: string } | undefined;
    private readonly connect: SmtpConnectionFactory;

    constructor(options: SmtpTransportOptions) {
        this.host = options.host;
        this.port = options.port;
        this.secure = options.secure ?? false;
        this.auth = options.auth;
        this.connect = options.connect ?? createBunSmtpConnection;
    }

    public async send(message: MailMessage): Promise<void> {
        const connection = await this.connect({
            hostname: this.host,
            port: this.port,
            tls: this.secure,
        });

        try {
            await expectCode(connection, 220);
            await connection.writeLine("EHLO ninots");
            await readMultiline(connection);

            if (this.auth !== undefined) {
                await connection.writeLine("AUTH LOGIN");
                await expectCode(connection, 334);
                await connection.writeLine(b64(this.auth.user));
                await expectCode(connection, 334);
                await connection.writeLine(b64(this.auth.pass));
                await expectCode(connection, 235);
            }

            await connection.writeLine(`MAIL FROM:<${message.from.address}>`);
            await expectCode(connection, 250);

            const recipients = [...message.to, ...message.cc, ...message.bcc];
            for (const recipient of recipients) {
                await connection.writeLine(`RCPT TO:<${recipient.address}>`);
                await expectCode(connection, 250);
            }

            await connection.writeLine("DATA");
            await expectCode(connection, 354);
            await connection.writeLine(buildMime(message));
            await connection.writeLine(".");
            await expectCode(connection, 250);

            await connection.writeLine("QUIT");
            await expectCode(connection, 221);
        } finally {
            await connection.close();
        }
    }
}

/**
 * Open a Bun TCP (optional TLS) socket and adapt it to {@link SmtpConnection}.
 */
export async function createBunSmtpConnection(options: {
    hostname: string;
    port: number;
    tls: boolean;
}): Promise<SmtpConnection> {
    const pending: Array<{
        resolve: (value: string) => void;
        reject: (error: Error) => void;
    }> = [];
    let buffer = "";
    let closed = false;

    const socket = await Bun.connect({
        hostname: options.hostname,
        port: options.port,
        tls: options.tls ? {} : undefined,
        socket: {
            data(_socket, data) {
                buffer += typeof data === "string" ? data : new TextDecoder().decode(data);
                flushLines();
            },
            open() {},
            close() {
                closed = true;
                while (pending.length > 0) {
                    pending.shift()?.reject(new Error("SMTP connection closed"));
                }
            },
            error(_socket, error) {
                closed = true;
                const err = error instanceof Error ? error : new Error(String(error));
                while (pending.length > 0) {
                    pending.shift()?.reject(err);
                }
            },
        },
    });

    function flushLines(): void {
        while (pending.length > 0) {
            const end = buffer.indexOf("\n");
            if (end === -1) {
                return;
            }
            let line = buffer.slice(0, end);
            buffer = buffer.slice(end + 1);
            if (line.endsWith("\r")) {
                line = line.slice(0, -1);
            }
            pending.shift()?.resolve(line);
        }
    }

    return {
        async writeLine(line: string): Promise<void> {
            if (closed) {
                throw new Error("SMTP connection closed");
            }
            socket.write(`${line}\r\n`);
        },
        async readResponse(): Promise<string> {
            if (closed) {
                throw new Error("SMTP connection closed");
            }
            const end = buffer.indexOf("\n");
            if (end !== -1) {
                let line = buffer.slice(0, end);
                buffer = buffer.slice(end + 1);
                if (line.endsWith("\r")) {
                    line = line.slice(0, -1);
                }
                return line;
            }
            return await new Promise<string>((resolve, reject) => {
                pending.push({ resolve, reject });
            });
        },
        async close(): Promise<void> {
            closed = true;
            socket.end();
        },
    };
}

function b64(value: string): string {
    return Buffer.from(value, "utf8").toString("base64");
}

function buildMime(message: MailMessage): string {
    const headers: string[] = [
        `From: ${formatAddress(message.from)}`,
        `To: ${formatAddressList(message.to)}`,
        `Subject: ${message.subject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
    ];
    if (message.cc.length > 0) {
        headers.push(`Cc: ${formatAddressList(message.cc)}`);
    }
    if (message.replyTo.length > 0) {
        headers.push(`Reply-To: ${formatAddressList(message.replyTo)}`);
    }
    for (const [key, value] of Object.entries(message.headers)) {
        headers.push(`${key}: ${value}`);
    }

    const hasHtml = message.html !== undefined && message.html.length > 0;
    const hasText = message.text !== undefined && message.text.length > 0;

    if (hasHtml && hasText) {
        const boundary = `ninots_${Date.now().toString(36)}`;
        // Replace Content-Type plain with multipart
        const idx = headers.findIndex((h) => h.startsWith("Content-Type:"));
        if (idx >= 0) {
            headers[idx] = `Content-Type: multipart/alternative; boundary="${boundary}"`;
        }
        const parts = [
            `--${boundary}`,
            "Content-Type: text/plain; charset=utf-8",
            "",
            message.text ?? "",
            `--${boundary}`,
            "Content-Type: text/html; charset=utf-8",
            "",
            message.html ?? "",
            `--${boundary}--`,
        ];
        return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
    }

    if (hasHtml) {
        const idx = headers.findIndex((h) => h.startsWith("Content-Type:"));
        if (idx >= 0) {
            headers[idx] = "Content-Type: text/html; charset=utf-8";
        }
        return `${headers.join("\r\n")}\r\n\r\n${message.html ?? ""}`;
    }

    return `${headers.join("\r\n")}\r\n\r\n${message.text ?? ""}`;
}

async function expectCode(connection: SmtpConnection, code: number): Promise<string> {
    const response = await connection.readResponse();
    if (!response.startsWith(String(code))) {
        throw new Error(`SMTP expected ${code}, got: ${response}`);
    }
    return response;
}

async function readMultiline(connection: SmtpConnection): Promise<string> {
    const lines: string[] = [];
    for (;;) {
        const line = await connection.readResponse();
        lines.push(line);
        if (/^\d{3} /.test(line)) {
            return lines.join("\n");
        }
    }
}
