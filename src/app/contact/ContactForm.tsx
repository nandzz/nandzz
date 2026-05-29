"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");

    const formData = new FormData(e.currentTarget);
    formData.append("access_key", process.env.NEXT_PUBLIC_FORM_ACCESS_KEY!);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Your name" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="How can we help?"
          rows={5}
          required
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send Message"}
      </Button>

      {status === "success" && (
        <p className="text-sm text-center text-green-600 dark:text-green-400">
          Message sent! We&apos;ll get back to you soon.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-center text-destructive">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
