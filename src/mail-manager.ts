/**
 * Mail manager — resolve named mailers (array | log | smtp).
 *
 * @packageDocumentation
 */

import { Mailer } from "./mailer";
import { ArrayTransport } from "./transports/array-transport";
import { LogTransport } from "./transports/log-transport";
import { SmtpTransport } from "./transports/smtp-transport";
import type { Address, MailerConfig, MailManagerConfig, MailTransport } from "./types";

/**
 * Resolves mailers from config and exposes the default mailer.
 */
export class MailManager {
    private readonly defaultMailer: string;
    private readonly from: Address;
    private readonly configs: Record<string, MailerConfig>;
    private readonly resolved = new Map<string, Mailer>();

    constructor(config: MailManagerConfig) {
        this.defaultMailer = config.default;
        this.from = config.from;
        this.configs = config.mailers;
    }

    /**
     * Default mailer name.
     */
    public getDefaultMailer(): string {
        return this.defaultMailer;
    }

    /**
     * Global From address.
     */
    public getFrom(): Address {
        return this.from;
    }

    /**
     * Resolve (and cache) a named mailer.
     */
    public mailer(name?: string): Mailer {
        const mailerName = name ?? this.defaultMailer;
        const cached = this.resolved.get(mailerName);
        if (cached !== undefined) {
            return cached;
        }

        const config = this.configs[mailerName];
        if (config === undefined) {
            throw new Error(`Mailer [${mailerName}] is not configured`);
        }

        const mailer = new Mailer({
            name: mailerName,
            transport: this.createTransport(config),
            from: this.from,
        });
        this.resolved.set(mailerName, mailer);
        return mailer;
    }

    /**
     * Alias for {@link mailer}.
     */
    public driver(name?: string): Mailer {
        return this.mailer(name);
    }

    private createTransport(config: MailerConfig): MailTransport {
        switch (config.driver) {
            case "array":
                return new ArrayTransport();
            case "log":
                return new LogTransport({ logger: config.logger });
            case "smtp":
                return new SmtpTransport({
                    host: config.host,
                    port: config.port,
                    ...(config.secure !== undefined ? { secure: config.secure } : {}),
                    ...(config.auth !== undefined ? { auth: config.auth } : {}),
                    ...(config.connect !== undefined ? { connect: config.connect } : {}),
                });
            default: {
                const neverDriver: never = config;
                throw new Error(`Mail driver [${JSON.stringify(neverDriver)}] is not supported`);
            }
        }
    }
}
