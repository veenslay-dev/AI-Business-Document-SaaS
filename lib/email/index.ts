type EmailMessage = { to: string; subject: string; text: string; html?: string };

/** Email boundary. Swap in Resend, Postmark or SES by implementing `send`. */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ delivered: boolean }>;
}

const logOnly: EmailProvider = {
  name: "log",
  async send(message) {
    console.info(`[email] not sent (no provider configured): "${message.subject}" to ${message.to.replace(/(.).+(@.+)/, "$1***$2")}`);
    return { delivered: false };
  },
};

export function getEmailProvider(): EmailProvider {
  return logOnly;
}
