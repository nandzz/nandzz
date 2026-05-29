import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Nandzz",
  description: "Privacy policy for the nandzz platform.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: May 24, 2026
      </p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-7">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p className="mt-3">
            We collect information you provide directly when you create an
            account, including your email address, username, and profile
            information. We also collect content you upload to the Platform.
          </p>
          <p className="mt-3">
            We automatically collect certain technical information when you use
            the Platform, including:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>IP address and approximate location</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Pages visited and interactions with the Platform</li>
            <li>Referring website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <p className="mt-3">We use the information we collect to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Provide, maintain, and improve the Platform</li>
            <li>Create and manage your account</li>
            <li>Display your public Spaces to other users</li>
            <li>Send important service-related communications</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. Information Sharing
          </h2>
          <p className="mt-3">
            We do not sell your personal information. We may share your
            information in the following limited circumstances:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>With service providers who assist in operating the Platform (e.g., hosting, analytics)</li>
            <li>When required by law or legal process</li>
            <li>To protect the rights, safety, or property of nandzz and its users</li>
            <li>With your consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. Data Storage & Security
          </h2>
          <p className="mt-3">
            Your data is stored securely using industry-standard practices. We
            use Supabase for authentication and data storage, which employs
            encryption at rest and in transit. However, no system is completely
            secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. Your Rights
          </h2>
          <p className="mt-3">You have the right to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent for optional data processing</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, contact us at{" "}
            <a
              href="mailto:nandz.it@gmail.com"
              className="text-violet-600 hover:underline"
            >
              nandz.it@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            6. Data Retention
          </h2>
          <p className="mt-3">
            We retain your account data for as long as your account is active.
            When you delete your account, we remove your personal data within 30
            days, except where retention is required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            7. Children&apos;s Privacy
          </h2>
          <p className="mt-3">
            The Platform is not intended for children under 13. We do not
            knowingly collect personal information from children under 13. If we
            become aware that we have collected such information, we will take
            steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            8. Changes to This Policy
          </h2>
          <p className="mt-3">
            We may update this Privacy Policy from time to time. We will notify
            users of material changes via the Platform or email. Your continued
            use of the Platform after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            9. Contact Us
          </h2>
          <p className="mt-3">
            For questions about this Privacy Policy, contact us at{" "}
            <a
              href="mailto:nandz.it@gmail.com"
              className="text-violet-600 hover:underline"
            >
              nandz.it@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
