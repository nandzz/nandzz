// No-op stand-in for the `server-only` package under Vitest. The real package
// throws when imported outside a Server Component; tests run in jsdom, so we
// alias it here (see vitest.config.ts) to allow unit-testing server-only
// modules such as feature data/ layers.
export {};
