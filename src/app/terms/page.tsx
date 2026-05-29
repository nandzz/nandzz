import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Nandzz",
  description: "Terms and conditions for using the nandzz platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Terms & Conditions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: May 24, 2026
      </p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-7">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="mt-3">
            By accessing or using nandzz (&quot;the Platform&quot;), you agree to
            be bound by these Terms & Conditions. If you do not agree to these
            terms, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. Description of Service
          </h2>
          <p className="mt-3">
            nandzz is a platform that allows users to save, host, and share
            AI-generated web applications. Users can upload HTML content or link
            external URLs to create &quot;Spaces&quot; that are viewable by the
            public or kept private.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. User Accounts
          </h2>
          <p className="mt-3">
            You must create an account to use certain features of the Platform.
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. User Content
          </h2>
          <p className="mt-3">
            You retain ownership of any content you upload to the Platform. By
            uploading content, you grant nandzz a non-exclusive, worldwide,
            royalty-free license to host, display, and distribute your content
            as part of the Platform&apos;s services.
          </p>
          <p className="mt-3">You agree not to upload content that:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Violates any applicable laws or regulations</li>
            <li>Infringes on intellectual property rights of others</li>
            <li>Contains malware, viruses, or harmful code</li>
            <li>Is abusive, harassing, or promotes violence</li>
            <li>Contains personally identifiable information of others without consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. Prohibited Uses
          </h2>
          <p className="mt-3">You may not use the Platform to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Distribute spam or unsolicited communications</li>
            <li>Attempt to gain unauthorized access to other accounts or systems</li>
            <li>Interfere with or disrupt the Platform&apos;s infrastructure</li>
            <li>Scrape or collect user data without authorization</li>
            <li>Use the Platform for any illegal purpose</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            6. Termination
          </h2>
          <p className="mt-3">
            We reserve the right to suspend or terminate your account at any time
            if you violate these terms. You may delete your account at any time
            through your profile settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            7. Disclaimer of Warranties
          </h2>
          <p className="mt-3">
            The Platform is provided &quot;as is&quot; without warranties of any
            kind, either express or implied. We do not guarantee that the
            Platform will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            8. Limitation of Liability
          </h2>
          <p className="mt-3">
            To the maximum extent permitted by law, nandzz shall not be liable
            for any indirect, incidental, special, or consequential damages
            arising from your use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            9. Changes to Terms
          </h2>
          <p className="mt-3">
            We may update these terms from time to time. We will notify users of
            significant changes via the Platform. Continued use after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            10. Contact
          </h2>
          <p className="mt-3">
            If you have questions about these terms, please contact us at{" "}
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
