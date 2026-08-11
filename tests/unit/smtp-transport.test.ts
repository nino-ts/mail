import { describe, expect, test } from "bun:test";
import { SmtpTransport } from "../../index";
import type { MailMessage } from "../../src/types";
import type { SmtpConnection } from "../../src/transports/smtp-transport";

function createMockSmtp(script: string[]): {
    connection: SmtpConnection;
    written: string[];
} {
    const written: string[] = [];
    let index = 0;

    const connection: SmtpConnection = {
        async writeLine(line: string): Promise<void> {
            written.push(line);
        },
        async readResponse(): Promise<string> {
            const next = script[index];
            if (next === undefined) {
                throw new Error("Mock SMTP script exhausted");
            }
            index += 1;
            return next;
        },
        async close(): Promise<void> {},
    };

    return { connection, written };
}

describe("SmtpTransport", () => {
    const baseMessage: MailMessage = {
        from: { address: "from@example.com", name: "From" },
        to: [{ address: "to@example.com" }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: "SMTP Hello",
        text: "Plain body",
        headers: {},
    };

    test("delivers MIME over scripted SMTP", async () => {
        const { connection, written } = createMockSmtp([
            "220 fake.smtp ready",
            "250-fake Hello",
            "250 AUTH LOGIN",
            "250 OK",
            "250 OK",
            "354 End data",
            "250 Queued",
            "221 Bye",
        ]);

        const transport = new SmtpTransport({
            host: "127.0.0.1",
            port: 2525,
            secure: false,
            connect: async () => connection,
        });

        await transport.send(baseMessage);

        expect(written[0]).toBe("EHLO ninots");
        expect(written.some((line) => line.startsWith("MAIL FROM:<from@example.com>"))).toBe(true);
        expect(written.some((line) => line.startsWith("RCPT TO:<to@example.com>"))).toBe(true);
        expect(written).toContain("DATA");
        expect(written.some((line) => line.includes("Subject: SMTP Hello"))).toBe(true);
        expect(written).toContain(".");
        expect(written).toContain("QUIT");
    });

    test("authenticates with AUTH LOGIN", async () => {
        const { connection, written } = createMockSmtp([
            "220 fake.smtp ready",
            "250-fake Hello",
            "250 AUTH LOGIN",
            "334 VXNlcm5hbWU6",
            "334 UGFzc3dvcmQ6",
            "235 Authentication successful",
            "250 OK",
            "250 OK",
            "354 End data",
            "250 Queued",
            "221 Bye",
        ]);

        const transport = new SmtpTransport({
            host: "127.0.0.1",
            port: 2525,
            auth: { user: "mailer", pass: "secret" },
            connect: async () => connection,
        });

        await transport.send(baseMessage);

        expect(written).toContain("AUTH LOGIN");
        expect(written).toContain(Buffer.from("mailer", "utf8").toString("base64"));
        expect(written).toContain(Buffer.from("secret", "utf8").toString("base64"));
    });

    test("throws when SMTP code mismatches", async () => {
        const { connection } = createMockSmtp(["421 unavailable"]);
        const transport = new SmtpTransport({
            host: "127.0.0.1",
            port: 2525,
            connect: async () => connection,
        });

        await expect(transport.send(baseMessage)).rejects.toThrow("SMTP expected 220");
    });
});
