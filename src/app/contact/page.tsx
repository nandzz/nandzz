import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — Nandzz",
  description: "Get in touch with the Nandzz team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-3 text-muted-foreground">
          Have a question or feedback? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ContactForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Or email us directly at{" "}
        <a
          href="mailto:support@nandzz.com"
          className="text-violet-600 hover:underline"
        >
          support@nandzz.com
        </a>
      </p>
    </div>
  );
}
