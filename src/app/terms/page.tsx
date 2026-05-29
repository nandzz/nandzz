import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Nandzz",
  description: "Terms and conditions for using the nandzz platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Terms &amp; Conditions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: May 29, 2026
      </p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-7">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="mt-3">
            By accessing or using the nandzz platform (&quot;Platform&quot;),
            you agree to be bound by these Terms &amp; Conditions
            (&quot;Terms&quot;) and our{" "}
            <a href="/privacy" className="text-violet-600 hover:underline">
              Privacy Policy
            </a>
            . If you do not agree, do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. Eligibility
          </h2>
          <p className="mt-3">
            You must be at least 13 years of age to use the Platform. By
            creating an account, you represent that you meet this age
            requirement. If you are between 13 and 18, you represent that you
            have obtained parental or guardian consent to use the Platform. We
            reserve the right to terminate accounts that we believe are held by
            users who do not meet the minimum age requirement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. Description of Service
          </h2>
          <p className="mt-3">
            nandzz is a platform that allows users to save, host, and share
            web content — including HTML applications, PDFs, tools, and
            interactive creations (&quot;Spaces&quot;). Spaces may be set to
            public or private visibility.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. User Accounts
          </h2>
          <p className="mt-3">
            You must create an account to use certain features of the Platform.
            You are responsible for:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              Maintaining the confidentiality of your login credentials
            </li>
            <li>
              All activity that occurs under your account, whether authorized
              by you or not
            </li>
            <li>
              Notifying us immediately at{" "}
              <a
                href="mailto:support@nandzz.com"
                className="text-violet-600 hover:underline"
              >
                support@nandzz.com
              </a>{" "}
              if you suspect unauthorized access to your account
            </li>
          </ul>
          <p className="mt-3">
            You may not create accounts for the purpose of impersonating
            another person or entity, or for automated or bulk account
            creation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. User Content
          </h2>
          <p className="mt-3">
            You retain ownership of all content you upload to the Platform
            (&quot;User Content&quot;). By uploading content, you grant nandzz
            a non-exclusive, worldwide, royalty-free license to host, store,
            display, and distribute your User Content solely as necessary to
            operate and provide the Platform.
          </p>
          <p className="mt-3">You represent and warrant that your User Content does not:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Violate any applicable law or regulation</li>
            <li>
              Infringe the intellectual property, privacy, or other rights of
              any third party
            </li>
            <li>Contain malware, viruses, exploits, or harmful code</li>
            <li>
              Constitute harassment, hate speech, threats, or content that
              promotes violence
            </li>
            <li>
              Include personally identifiable information of others without
              their consent
            </li>
            <li>
              Impersonate any person or entity or misrepresent your affiliation
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            6. Intellectual Property &amp; DMCA
          </h2>
          <p className="mt-3">
            We respect intellectual property rights. If you believe that
            content on the Platform infringes your copyright, please send a
            notice to{" "}
            <a
              href="mailto:support@nandzz.com"
              className="text-violet-600 hover:underline"
            >
              support@nandzz.com
            </a>{" "}
            with the following information:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              Identification of the copyrighted work you claim has been
              infringed
            </li>
            <li>
              Identification of the allegedly infringing content and its
              location on the Platform
            </li>
            <li>Your contact information</li>
            <li>
              A statement that you have a good-faith belief that the use is not
              authorized
            </li>
            <li>
              A statement, made under penalty of perjury, that the information
              in your notice is accurate
            </li>
          </ul>
          <p className="mt-3">
            The nandzz name, logo, and all related trademarks are the exclusive
            property of nandzz. You may not use them without our prior written
            consent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            7. Prohibited Uses
          </h2>
          <p className="mt-3">You may not use the Platform to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Send spam or unsolicited bulk communications</li>
            <li>
              Attempt to gain unauthorized access to other accounts, systems,
              or networks
            </li>
            <li>
              Interfere with, disrupt, or overburden the Platform&apos;s
              infrastructure
            </li>
            <li>Scrape or harvest user data without our written permission</li>
            <li>Use automated tools to create accounts in bulk</li>
            <li>Circumvent any access controls or security measures</li>
            <li>Engage in any activity that violates applicable law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            8. Termination
          </h2>
          <p className="mt-3">
            We reserve the right to suspend or permanently terminate your
            account, with or without notice, if you violate these Terms or
            engage in conduct we determine to be harmful to the Platform or its
            users. Where practical, we will notify you and give you an
            opportunity to resolve the issue before termination.
          </p>
          <p className="mt-3">
            You may delete your account at any time through your account
            settings. Upon deletion, your personal data will be removed in
            accordance with our{" "}
            <a href="/privacy" className="text-violet-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            9. Disclaimer of Warranties
          </h2>
          <p className="mt-3">
            The Platform is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, either express or
            implied, including but not limited to warranties of merchantability,
            fitness for a particular purpose, or non-infringement. We do not
            warrant that the Platform will be uninterrupted, error-free, or
            free of harmful components.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            10. Limitation of Liability
          </h2>
          <p className="mt-3">
            To the maximum extent permitted by applicable law, nandzz and its
            affiliates, officers, employees, and agents shall not be liable for
            any indirect, incidental, special, consequential, or punitive
            damages — including loss of profits, data, or goodwill — arising
            from your use of or inability to use the Platform, even if advised
            of the possibility of such damages.
          </p>
          <p className="mt-3">
            Our total liability to you for any claim arising out of or relating
            to the Platform shall not exceed USD $50.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            11. Changes to Terms
          </h2>
          <p className="mt-3">
            We may update these Terms from time to time. We will notify you of
            material changes by posting a notice on the Platform and, where
            required, by email at least 14 days before the changes take effect.
            Your continued use of the Platform after changes take effect
            constitutes your acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            12. Governing Law
          </h2>
          <p className="mt-3">
            These Terms are governed by and construed in accordance with
            applicable law. Any dispute arising out of or in connection with
            these Terms shall first be attempted to be resolved through good
            faith negotiation. If unresolved, disputes shall be subject to the
            exclusive jurisdiction of the competent courts of the jurisdiction
            where nandzz is established.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            13. Contact
          </h2>
          <p className="mt-3">
            If you have questions about these Terms, please contact us at{" "}
            <a
              href="mailto:support@nandzz.com"
              className="text-violet-600 hover:underline"
            >
              support@nandzz.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
