// Amazon SES (SESv2 SendEmail) sender, signed with SigV4 via aws4fetch — no full
// AWS SDK. Mirrors the graceful degradation of src/lib/email.ts: when the SES_*
// env is incomplete, `readSesConfig` returns null and callers no-op the send.

import { AwsClient } from "https://esm.sh/aws4fetch@1";

export type SesConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  from: string;
};

// Returns the SES config only when every required SES_* var is present.
export function readSesConfig(): SesConfig | null {
  const region = Deno.env.get("SES_REGION");
  const accessKeyId = Deno.env.get("SES_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("SES_SECRET_ACCESS_KEY");
  const from = Deno.env.get("SES_EMAIL_FROM");
  if (!region || !accessKeyId || !secretAccessKey || !from) return null;
  return { region, accessKeyId, secretAccessKey, from };
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

// Send one email via the SESv2 SendEmail HTTPS API. Throws on non-2xx so the
// caller can log + continue (best-effort). Returns the SES MessageId on success
// so it can be logged and traced in the SES dashboard. SigV4 service name is "ses".
export async function sendSesEmail(cfg: SesConfig, input: SendEmailInput): Promise<string> {
  const aws = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: cfg.region,
    service: "ses",
  });

  const endpoint = `https://email.${cfg.region}.amazonaws.com/v2/email/outbound-emails`;
  const payload = {
    FromEmailAddress: cfg.from,
    Destination: { ToAddresses: [input.to] },
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: { Html: { Data: input.html, Charset: "UTF-8" } },
      },
    },
  };

  const res = await aws.fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`SES SendEmail failed: ${res.status} ${text}`);
  }

  // SESv2 SendEmail returns { "MessageId": "..." } on success. If it's absent on
  // a 2xx, surface the status + body so a wrong endpoint/response is diagnosable.
  let messageId: string | undefined;
  try {
    messageId = (JSON.parse(text) as { MessageId?: string }).MessageId;
  } catch {
    // non-JSON body
  }
  return messageId ?? `(no MessageId; status ${res.status}, body: ${text.slice(0, 200)})`;
}
