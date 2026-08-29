// renderTemplate now resolves {{#key}}…{{/key}} conditional sections in addition
// to {{variable}} substitution. These lock the "optional row disappears when the
// variable is empty" behaviour the booking email templates rely on for staff/price.

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderTemplate } from "../messages.ts";

Deno.test("section kept when the variable is non-empty", () => {
  const out = renderTemplate("A{{#staff}} with {{staff}}{{/staff}}B", { staff: "Marco" });
  assertEquals(out, "A with MarcoB");
});

Deno.test("section stripped (label and all) when the variable is empty", () => {
  const out = renderTemplate("A{{#staff}} with {{staff}}{{/staff}}B", { staff: "" });
  assertEquals(out, "AB");
});

Deno.test("section stripped when the variable is whitespace-only", () => {
  const out = renderTemplate("A{{#price}}[{{price}}]{{/price}}B", { price: "   " });
  assertEquals(out, "AB");
});

Deno.test("independent sections resolve independently", () => {
  const tpl = "{{#staff}}S:{{staff}};{{/staff}}{{#price}}P:{{price}};{{/price}}";
  assertEquals(renderTemplate(tpl, { staff: "Ana", price: "" }), "S:Ana;");
  assertEquals(renderTemplate(tpl, { staff: "", price: "€10" }), "P:€10;");
});

Deno.test("plain substitution still works and leaves unknown placeholders visible", () => {
  const out = renderTemplate("Hi {{name}}, {{unknown}}", { name: "Ana" });
  assertStringIncludes(out, "Hi Ana,");
  assertStringIncludes(out, "{{unknown}}");
});
