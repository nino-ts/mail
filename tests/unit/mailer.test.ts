import { describe, expect, test } from "bun:test";
import { ArrayTransport, Mailer, MailManager, toAddress } from "../../index";
import type { Mailable } from "../../src/types";

describe("toAddress", () => {
    test("normalizes string and object forms", () => {
        expect(toAddress("a@example.com")).toEqual({ address: "a@example.com" });
        expect(toAddress({ address: "b@example.com", name: "Bee" })).toEqual({
            address: "b@example.com",
            name: "Bee",
        });
        expect(() => toAddress("")).toThrow("must not be empty");
    });
});

describe("Mailer + ArrayTransport", () => {
    test("send records normalized message", async () => {
        const transport = new ArrayTransport();
        const mailer = new Mailer({
            name: "array",
            transport,
            from: { address: "from@example.com", name: "From" },
        });

        await mailer.send({
            to: "to@example.com",
            subject: "Hello",
            text: "Body",
        });

        expect(transport.messages).toHaveLength(1);
        expect(transport.messages[0]?.to[0]?.address).toBe("to@example.com");
        expect(transport.messages[0]?.from.address).toBe("from@example.com");
        expect(transport.messages[0]?.subject).toBe("Hello");
    });

    test("fluent to/cc sendOptions", async () => {
        const transport = new ArrayTransport();
        const mailer = new Mailer({
            name: "array",
            transport,
            from: { address: "noreply@example.com" },
        });

        await mailer.to("a@example.com").cc("c@example.com").sendOptions({
            subject: "X",
            html: "<p>Hi</p>",
        });

        const message = transport.messages[0];
        expect(message?.to.map((a) => a.address)).toEqual(["a@example.com"]);
        expect(message?.cc.map((a) => a.address)).toEqual(["c@example.com"]);
        expect(message?.html).toBe("<p>Hi</p>");
    });

    test("html and raw helpers", async () => {
        const transport = new ArrayTransport();
        const mailer = new Mailer({
            name: "array",
            transport,
            from: { address: "noreply@example.com" },
        });

        await mailer.html("a@example.com", "HTML", "<b>Hi</b>");
        await mailer.raw("b@example.com", "RAW", "plain");

        expect(transport.messages).toHaveLength(2);
        expect(transport.messages[0]?.html).toBe("<b>Hi</b>");
        expect(transport.messages[1]?.text).toBe("plain");
    });

    test("send Mailable", async () => {
        const transport = new ArrayTransport();
        const mailer = new Mailer({
            name: "array",
            transport,
            from: { address: "noreply@example.com" },
        });

        const mailable: Mailable = {
            envelope: () => ({
                to: "user@example.com",
                subject: "Welcome",
            }),
            content: () => ({
                text: "Welcome aboard",
            }),
        };

        await mailer.send(mailable);
        expect(transport.messages[0]?.subject).toBe("Welcome");
        expect(transport.messages[0]?.text).toBe("Welcome aboard");
    });

    test("PendingMail.send overrides mailable recipients", async () => {
        const transport = new ArrayTransport();
        const mailer = new Mailer({
            name: "array",
            transport,
            from: { address: "noreply@example.com" },
        });

        const mailable: Mailable = {
            envelope: () => ({
                to: "ignored@example.com",
                subject: "Hi",
            }),
            content: () => ({ text: "body" }),
        };

        await mailer.to("real@example.com").send(mailable);
        expect(transport.messages[0]?.to[0]?.address).toBe("real@example.com");
    });

    test("rejects missing to/body", async () => {
        const transport = new ArrayTransport();
        const mailer = new Mailer({
            name: "array",
            transport,
            from: { address: "from@example.com" },
        });

        await expect(mailer.send({ to: [], subject: "x", text: "y" })).rejects.toThrow("at least one recipient");

        await expect(mailer.send({ to: "a@example.com", subject: "x" })).rejects.toThrow("html and/or text");
    });

    test("flush clears array transport", async () => {
        const transport = new ArrayTransport();
        const mailer = new Mailer({
            name: "array",
            transport,
            from: { address: "noreply@example.com" },
        });
        await mailer.send({ to: "a@example.com", subject: "x", text: "y" });
        transport.flush();
        expect(transport.messages).toHaveLength(0);
    });
});

describe("MailManager", () => {
    test("resolves array and log mailers", async () => {
        const lines: string[] = [];
        const manager = new MailManager({
            default: "array",
            from: { address: "app@example.com" },
            mailers: {
                array: { driver: "array" },
                log: {
                    driver: "log",
                    logger: (line) => {
                        lines.push(line);
                    },
                },
            },
        });

        expect(manager.getDefaultMailer()).toBe("array");
        await manager.mailer().send({
            to: "you@example.com",
            subject: "Hi",
            text: "Hello",
        });

        const arrayTransport = manager.mailer().getTransport();
        expect(arrayTransport).toBeInstanceOf(ArrayTransport);
        expect((arrayTransport as ArrayTransport).messages).toHaveLength(1);

        await manager.mailer("log").send({
            to: "you@example.com",
            subject: "Logged",
            text: "see log",
        });
        expect(lines.some((line) => line.includes("Subject: Logged"))).toBe(true);
        expect(manager.driver("log").name).toBe("log");
    });

    test("unknown mailer throws", () => {
        const manager = new MailManager({
            default: "array",
            from: { address: "app@example.com" },
            mailers: { array: { driver: "array" } },
        });
        expect(() => manager.mailer("missing")).toThrow("not configured");
    });
});
