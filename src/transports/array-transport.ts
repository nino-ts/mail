/**
 * In-memory transport for tests.
 *
 * @packageDocumentation
 */

import type { MailMessage, MailTransport } from "../types";

/**
 * Collects every sent {@link MailMessage} for assertions.
 */
export class ArrayTransport implements MailTransport {
    public readonly messages: MailMessage[] = [];

    public async send(message: MailMessage): Promise<void> {
        this.messages.push(message);
    }

    /**
     * Clear collected messages.
     */
    public flush(): void {
        this.messages.length = 0;
    }
}
