// Single source for the pricing FAQ — rendered visibly by PricingClient and
// emitted as FAQPage structured data by the pricing page so the two never drift.
export const pricingFaqs: { q: string; a: string }[] = [
  {
    q: "What do the plans include?",
    a: "Free lets you build a branded page with up to 25 spaces and content sections. Starter unlocks widgets (booking + AI agent), MCP access and 500 AI credits a month. Pro adds analytics and 1,500 AI credits a month, with unlimited spaces on both paid plans.",
  },
  {
    q: "How do AI credits work?",
    a: "Paid plans include a monthly AI credit allowance that resets each billing period. Credits are spent on AI features — chatting with your agent and editing pages with AI. Need more? Buy top-up packs that never expire; they're only used after your monthly allowance runs out.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Yes — upgrade, downgrade or cancel anytime from your subscription page. Cancelling drops you back to the Free plan at the end of the billing period.",
  },
  {
    q: "Do purchased credits expire?",
    a: "No. Top-up credits you buy never expire. Only the monthly plan allowance resets each period.",
  },
  {
    q: "Is my payment information secure?",
    a: "Payments are processed by Stripe, a PCI-compliant payment processor. We never store your card details.",
  },
];
