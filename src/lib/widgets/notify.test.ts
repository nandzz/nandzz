import { describe, it, expect, vi, beforeEach } from "vitest";
import { bookingMessageVars, dispatchBookingMessage, type BookingMessageContext } from "./notify";
import { renderTemplate } from "./messages";
import type { MessageTemplate } from "@/lib/types";

const mockSendWhatsApp = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/whatsapp", () => ({ sendWhatsApp: (...args: unknown[]) => mockSendWhatsApp(...args) }));

function baseCtx(overrides: Partial<BookingMessageContext> = {}): BookingMessageContext {
  return {
    customerName: "Jamie Rivera",
    customerEmail: "jamie@example.com",
    customerPhone: "+15551234567",
    businessName: "Acme Studio",
    serviceName: "Haircut",
    staffName: null,
    startsAt: "2026-08-10T09:00:00.000Z",
    timezone: "UTC",
    priceCents: null,
    currencySymbol: "$",
    manageUrl: "https://nandzz.com/booking/abc",
    ...overrides,
  };
}

beforeEach(() => {
  mockSendWhatsApp.mockReset().mockResolvedValue(true);
});

describe("bookingMessageVars", () => {
  it("extracts the first name from a multi-word customer name", () => {
    expect(bookingMessageVars(baseCtx()).customer_first_name).toBe("Jamie");
  });

  it("uses the full name as the first name when there's no space", () => {
    expect(bookingMessageVars(baseCtx({ customerName: "Cher" })).customer_first_name).toBe("Cher");
  });

  it("formats a whole-dollar price with no decimals", () => {
    expect(bookingMessageVars(baseCtx({ priceCents: 4000 })).price).toBe("$40");
  });

  it("formats a fractional price with two decimals", () => {
    expect(bookingMessageVars(baseCtx({ priceCents: 4050 })).price).toBe("$40.50");
  });

  it("renders an empty price when priceCents is null", () => {
    expect(bookingMessageVars(baseCtx({ priceCents: null })).price).toBe("");
  });

  it("renders an empty price when priceCents is zero or negative", () => {
    expect(bookingMessageVars(baseCtx({ priceCents: 0 })).price).toBe("");
    expect(bookingMessageVars(baseCtx({ priceCents: -100 })).price).toBe("");
  });

  it("substitutes an empty string for staff when none is assigned", () => {
    expect(bookingMessageVars(baseCtx({ staffName: null })).staff).toBe("");
  });

  it("passes the staff name through when assigned", () => {
    expect(bookingMessageVars(baseCtx({ staffName: "Alex Kim" })).staff).toBe("Alex Kim");
  });

  it("produces vars that plug into renderTemplate for every declared placeholder", () => {
    const vars = bookingMessageVars(baseCtx({ priceCents: 4000, staffName: "Alex" }));
    const rendered = renderTemplate(
      "{{customer_name}}/{{customer_first_name}}/{{service}}/{{staff}}/{{date_time}}/{{business}}/{{price}}/{{manage_url}}",
      vars
    );
    expect(rendered).not.toMatch(/\{\{/); // every placeholder above was resolved
  });
});

describe("dispatchBookingMessage", () => {
  const tpl = (overrides: Partial<MessageTemplate> = {}): MessageTemplate => ({
    channel: "both",
    subject: "Booking confirmed — {{service}}",
    body: "Hi {{customer_first_name}}, see you for {{service}} at {{date_time}}.",
    ...overrides,
  });

  // Email is no longer dispatched here — it flows through the booking-notifications
  // edge function. dispatchBookingMessage is now WhatsApp-only; the "email"/"both"
  // channels still send WhatsApp (for "both") but never email.

  it("sends nothing when the template is off", async () => {
    await dispatchBookingMessage(tpl({ channel: "off" }), baseCtx());
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("sends no whatsapp for an email-only template (email is handled elsewhere)", async () => {
    await dispatchBookingMessage(tpl({ channel: "email" }), baseCtx());
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("sends whatsapp for a whatsapp-only template", async () => {
    await dispatchBookingMessage(tpl({ channel: "whatsapp" }), baseCtx());
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
  });

  it("sends whatsapp for 'both' (email no longer dispatched here)", async () => {
    await dispatchBookingMessage(tpl({ channel: "both" }), baseCtx());
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
  });

  it("skips whatsapp when the customer has no phone on file, even if the channel wants it", async () => {
    await dispatchBookingMessage(tpl({ channel: "both" }), baseCtx({ customerPhone: null }));
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("renders template variables into the sent whatsapp body", async () => {
    await dispatchBookingMessage(tpl({ channel: "whatsapp" }), baseCtx({ serviceName: "Massage" }));
    const call = mockSendWhatsApp.mock.calls[0][0];
    expect(call.to).toBe("+15551234567");
    expect(call.body).toContain("Massage");
  });

  it("never rejects even when the send fails", async () => {
    mockSendWhatsApp.mockRejectedValue(new Error("Twilio down"));
    await expect(dispatchBookingMessage(tpl({ channel: "both" }), baseCtx())).resolves.toBeUndefined();
  });
});
