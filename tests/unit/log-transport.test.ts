import { describe, expect, test } from "bun:test";
import { LogTransport } from "../../index";
import type { MailMessage } from "../../src/types";

describe("LogTransport", () => {
    test("logs a readable dump", async () => {
        const lines: string[] = [];
        const transport = new LogTransport({
            logger: (line) => {
                lines.push(line);
            },
        });

        const message: MailMessage = {
            from: { address: "from@example.com", name: "From" },
            to: [{ address: "ada@example.com", name: "Ada" }],
            cc: [{ address: "cc@example.com" }],
            bcc: [],
            replyTo: [],
            subject: "Log me",
            text: "Hello",
            html: "<p>Hello</p>",
            headers: { "X-Test": "1" },
        };

        await transport.send(message);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("Subject: Log me");
        expect(lines[0]).toContain("Ada <ada@example.com>");
        expect(lines[0]).toContain("X-Test: 1");
        expect(lines[0]).toContain("<p>Hello</p>");
    });
});
