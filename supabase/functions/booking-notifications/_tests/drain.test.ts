import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  collectBookingIds,
  mapWithConcurrency,
  partitionQueueOutcomes,
  type QueueMessage,
} from "../drain.ts";

// ── mapWithConcurrency ─────────────────────────────────────────────────────────

Deno.test("mapWithConcurrency — returns results in input order", async () => {
  const items = [1, 2, 3, 4, 5];
  const out = await mapWithConcurrency(items, 2, async (n) => {
    // Larger items resolve sooner, so order is only preserved by index, not timing.
    await delay((10 - n) * 2);
    return n * 10;
  });
  assertEquals(out, [10, 20, 30, 40, 50]);
});

Deno.test("mapWithConcurrency — never exceeds the concurrency limit", async () => {
  const limit = 3;
  let inFlight = 0;
  let maxInFlight = 0;
  const items = Array.from({ length: 20 }, (_, i) => i);
  await mapWithConcurrency(items, limit, async () => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await delay(5);
    inFlight--;
    return null;
  });
  assert(maxInFlight <= limit, `maxInFlight ${maxInFlight} exceeded limit ${limit}`);
  assert(maxInFlight >= 1);
});

Deno.test("mapWithConcurrency — processes every item exactly once", async () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  const seen: number[] = [];
  const out = await mapWithConcurrency(items, 7, async (n) => {
    await delay(1);
    seen.push(n);
    return n;
  });
  assertEquals(out, items);
  assertEquals([...seen].sort((a, b) => a - b), items);
});

Deno.test("mapWithConcurrency — empty input returns empty array", async () => {
  const out = await mapWithConcurrency<number, number>([], 5, async (n) => n);
  assertEquals(out, []);
});

Deno.test("mapWithConcurrency — a limit larger than the item count is clamped", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const items = [1, 2, 3];
  await mapWithConcurrency(items, 100, async () => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await delay(3);
    inFlight--;
    return null;
  });
  assert(maxInFlight <= items.length, `maxInFlight ${maxInFlight} exceeded item count`);
});

// ── partitionQueueOutcomes ─────────────────────────────────────────────────────

Deno.test("partitionQueueOutcomes — ok ⇒ delete", () => {
  const { deleteIds, archiveIds } = partitionQueueOutcomes(
    [
      { msg_id: 1, read_ct: 1, ok: true },
      { msg_id: 2, read_ct: 9, ok: true },
    ],
    5,
  );
  assertEquals(deleteIds, [1, 2]);
  assertEquals(archiveIds, []);
});

Deno.test("partitionQueueOutcomes — failed & read_ct >= maxReads ⇒ archive", () => {
  const { deleteIds, archiveIds } = partitionQueueOutcomes(
    [{ msg_id: 7, read_ct: 5, ok: false }],
    5,
  );
  assertEquals(deleteIds, []);
  assertEquals(archiveIds, [7]);
});

Deno.test("partitionQueueOutcomes — failed & under maxReads ⇒ neither (redelivered)", () => {
  const { deleteIds, archiveIds } = partitionQueueOutcomes(
    [{ msg_id: 4, read_ct: 4, ok: false }],
    5,
  );
  assertEquals(deleteIds, []);
  assertEquals(archiveIds, []);
});

Deno.test("partitionQueueOutcomes — mixed batch splits correctly", () => {
  const { deleteIds, archiveIds } = partitionQueueOutcomes(
    [
      { msg_id: 1, read_ct: 1, ok: true }, // delete
      { msg_id: 2, read_ct: 2, ok: false }, // redelivered
      { msg_id: 3, read_ct: 5, ok: false }, // archive (boundary is inclusive)
      { msg_id: 4, read_ct: 8, ok: false }, // archive
      { msg_id: 5, read_ct: 3, ok: true }, // delete
    ],
    5,
  );
  assertEquals(deleteIds, [1, 5]);
  assertEquals(archiveIds, [3, 4]);
});

// ── collectBookingIds ──────────────────────────────────────────────────────────

Deno.test("collectBookingIds — dedups preserving first-seen order", () => {
  const messages: QueueMessage[] = [
    { msg_id: 1, read_ct: 1, message: { booking_id: "b1", event: "reminder", actor: "system" } },
    { msg_id: 2, read_ct: 1, message: { booking_id: "b2", event: "reminder", actor: "system" } },
    { msg_id: 3, read_ct: 1, message: { booking_id: "b1", event: "reminder", actor: "system" } },
  ];
  assertEquals(collectBookingIds(messages), ["b1", "b2"]);
});

Deno.test("collectBookingIds — drops blank / non-string booking ids", () => {
  const messages: QueueMessage[] = [
    { msg_id: 1, read_ct: 1, message: { booking_id: "b1" } },
    { msg_id: 2, read_ct: 1, message: { booking_id: "" } },
    { msg_id: 3, read_ct: 1, message: { booking_id: 42 } },
    { msg_id: 4, read_ct: 1, message: {} },
    { msg_id: 5, read_ct: 1, message: { booking_id: "b2" } },
  ];
  assertEquals(collectBookingIds(messages), ["b1", "b2"]);
});

Deno.test("collectBookingIds — empty batch returns []", () => {
  assertEquals(collectBookingIds([]), []);
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
