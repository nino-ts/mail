/**
 * Integration: SmtpTransport / MailManager → MailDev SMTP + REST assert.
 *
 * Requires MailDev: `docker compose up -d` (see compose.yaml).
 * Skips gracefully when SMTP/REST is unreachable.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MailManager } from "../../index";

const SMTP_HOST = "127.0.0.1";
const SMTP_PORT = 1025;
const REST_BASE = "http://127.0.0.1:1080";

interface MailDevEmail {
    id: string;
    subject: string;
    text?: string;
    html?: string;
    from: Array<{ address: string; name?: string }>;
    to: Array<{ address: string; name?: string }>;
}

async function isMailDevUp(): Promise<boolean> {
    try {
        const health = await fetch(`${REST_BASE}/api/healthz`, {
            signal: AbortSignal.timeout(1500),
        });
        if (!health.ok) {
            return false;
        }
    } catch {
        return false;
    }

    try {
        const socket = await Bun.connect({
            hostname: SMTP_HOST,
            port: SMTP_PORT,
            socket: {
                data() {},
                open() {},
                close() {},
                error() {},
            },
        });
        socket.end();
        return true;
    } catch {
        return false;
    }
}

async function deleteAllEmails(): Promise<void> {
    await fetch(`${REST_BASE}/api/email/all`, { method: "DELETE" });
}

async function listEmails(): Promise<MailDevEmail[]> {
    const response = await fetch(`${REST_BASE}/api/email`);
    if (!response.ok) {
        throw new Error(`MailDev REST list failed: ${response.status}`);
    }
    return (await response.json()) as MailDevEmail[];
}

async function waitForEmail(predicate: (email: MailDevEmail) => boolean): Promise<MailDevEmail> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
        const emails = await listEmails();
        const match = emails.find(predicate);
        if (match !== undefined) {
            return match;
        }
        await Bun.sleep(100);
    }
    throw new Error("Timed out waiting for MailDev email");
}

const maildevAvailable = await isMailDevUp();

describe("MailDev SMTP integration", () => {
    beforeAll(async () => {
        if (!maildevAvailable) {
            return;
        }
        await deleteAllEmails();
    });

    afterAll(async () => {
        if (!maildevAvailable) {
            return;
        }
        await deleteAllEmails();
    });

    test("skips when MailDev is down (document: docker compose up -d)", () => {
        if (maildevAvailable) {
            expect(maildevAvailable).toBe(true);
            return;
        }
        console.warn(
            "[maildev] SMTP/REST not reachable at localhost:1025 / :1080 — run `docker compose up -d` then re-run tests",
        );
        expect(true).toBe(true);
    });

    test.skipIf(!maildevAvailable)(
        "MailManager smtp delivers to MailDev and REST asserts body",
        async () => {
            const subject = `ninots-maildev-${Date.now()}`;
            const text = "Hello from @ninots/mail MailDev harness";

            const mail = new MailManager({
                default: "smtp",
                from: { address: "noreply@ninots.test", name: "Ninots Mail" },
                mailers: {
                    smtp: {
                        driver: "smtp",
                        host: SMTP_HOST,
                        port: SMTP_PORT,
                        secure: false,
                    },
                },
            });

            await mail.mailer().send({
                to: "inbox@example.com",
                subject,
                text,
            });

            const delivered = await waitForEmail((email) => email.subject === subject);
            expect(delivered.to.some((addr) => addr.address === "inbox@example.com")).toBe(true);
            expect(delivered.from.some((addr) => addr.address === "noreply@ninots.test")).toBe(
                true,
            );
            expect(delivered.text ?? "").toContain(text);
        },
    );
});
