import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Nandzz",
  description: "Cookie policy for the Nandzz platform.",
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Cookie Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: May 24, 2026
      </p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-7">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. What Are Cookies
          </h2>
          <p className="mt-3">
            Cookies are small text files stored on your device when you visit a
            website. They help us provide you with a better experience by
            remembering your preferences and enabling core functionality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. Cookies We Use
          </h2>
          <div className="mt-3 space-y-4">
            <div>
              <h3 className="font-medium text-foreground">
                Essential Cookies (Required)
              </h3>
              <p className="mt-1">
                These cookies are necessary for the Platform to function. They
                handle authentication, session management, and security. Without
                them, you cannot log in or use core features.
              </p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>
                  <span className="font-medium text-foreground">Authentication cookies</span>{" "}
                  — Maintain your login session
                </li>
                <li>
                  <span className="font-medium text-foreground">Security cookies</span>{" "}
                  — Protect against cross-site request forgery (CSRF)
                </li>
                <li>
                  <span className="font-medium text-foreground">Preference cookies</span>{" "}
                  — Store your theme preference (light/dark mode)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-foreground">
                Analytics Cookies (Optional)
              </h3>
              <p className="mt-1">
                These cookies help us understand how users interact with the
                Platform so we can improve it. They collect anonymized usage data
                such as pages visited and time on site.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. Third-Party Cookies
          </h2>
          <p className="mt-3">
            We use Supabase for authentication, which may set its own cookies to
            manage your session securely. We do not use advertising cookies or
            share cookie data with advertisers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. Managing Cookies
          </h2>
          <p className="mt-3">
            You can control cookies through your browser settings. Most browsers
            allow you to:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>View what cookies are stored on your device</li>
            <li>Delete individual or all cookies</li>
            <li>Block cookies from specific or all sites</li>
            <li>Set preferences for first-party vs. third-party cookies</li>
          </ul>
          <p className="mt-3">
            Please note that blocking essential cookies will prevent you from
            using core features of the Platform, including logging in.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. Cookie Consent
          </h2>
          <p className="mt-3">
            When you first visit the Platform, we ask for your consent to use
            non-essential cookies. You can change your preferences at any time
            through the cookie settings in the footer. Essential cookies do not
            require consent as they are necessary for the Platform to function.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            6. Changes to This Policy
          </h2>
          <p className="mt-3">
            We may update this Cookie Policy as our use of cookies evolves. Any
            changes will be reflected on this page with an updated date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            7. Contact Us
          </h2>
          <p className="mt-3">
            If you have questions about our use of cookies, contact us at{" "}
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
