import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  combineServices,
  computeAvailableSlots,
  eligibleStaffForService,
  normalizeCalendarConfig,
  todayInZone,
} from "@/lib/widgets/calendar";
import { currencySymbol } from "@/lib/widgets/messages";
import { dispatchBookingMessage } from "@/lib/widgets/notify";
import type { WidgetBooking } from "@/lib/types";

// Customer self-serve: view / reschedule / cancel a booking by its unguessable
// manage_token. No login — the token is the authorization. Uses the
// service-role client (customers have no RLS grant on widget_bookings).

async function loadBooking(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("widget_bookings")
    .select(
      "*, instance:widget_instances(config, enabled, owner:profiles(display_name, username))"
    )
    .eq("manage_token", token)
    .maybeSingle();
  // Surface the query error rather than swallowing it: an embed/schema failure
  // here otherwise masquerades as a 404 "Booking not found" (the caller only
  // checks `!data`), which is what it looks like when the token is genuinely
  // missing. Log it so the real cause is visible in the server console.
  if (error) console.error("loadBooking failed for token", token, error);
  return { admin, data, error };
}

// The owner dashboard cancels/reschedules through this SAME token route the
// public manage page uses, so the caller's identity is the only signal of who
// acted. If the signed-in user IS the booking's owner ⇒ the business initiated
// it (customer must be told); otherwise treat it as customer-initiated (guests
// have no session, and a customer managing their own booking isn't the owner).
// Mirrors create_booking_tx's created_by == owner heuristic.
async function resolveActor(ownerUserId: string): Promise<"business" | "customer"> {
  try {
    const ssr = await createClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    return user?.id && user.id === ownerUserId ? "business" : "customer";
  } catch {
    return "customer";
  }
}

function present(booking: WidgetBooking, instance: { owner?: { display_name?: string; username?: string } | null; config?: unknown }) {
  const owner = instance?.owner as { display_name?: string; username?: string } | null;
  return {
    id: booking.id,
    service_name: booking.service_name,
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    status: booking.status,
    customer_name: booking.customer_name,
    business_name: owner?.display_name || owner?.username || "your provider",
    business_username: owner?.username ?? null,
    timezone: normalizeCalendarConfig(instance?.config).timezone,
    instance_id: booking.instance_id,
    service_id: booking.service_id,
    location_id: booking.location_id,
    staff_id: booking.staff_id,
    staff_name: booking.staff_name,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { data, error } = await loadBooking(token);
  // Keep the real cause in the server log (loadBooking logs it); the client gets a
  // generic message so a DB/schema failure never leaks out or masquerades as 404.
  if (error) return NextResponse.json({ error: "Unable to load booking." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const booking = data as unknown as WidgetBooking;
  return NextResponse.json(present(booking, (data as { instance?: unknown }).instance as never));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { admin, data, error: loadError } = await loadBooking(token);
  if (loadError) return NextResponse.json({ error: "Unable to load booking." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const booking = data as unknown as WidgetBooking;
  const alreadyCancelled = booking.status === "cancelled";

  // Record who is cancelling in the same UPDATE: the DB trigger reads
  // notify_actor to decide the email recipient (owner ⇒ tell the customer;
  // customer ⇒ tell the business) and fires the edge function itself. Next never
  // calls the edge function. The trigger's OLD.status guard suppresses a repeat
  // cancel, so writing notify_actor on a double-cancel is harmless.
  const actor = await resolveActor(booking.owner_user_id);
  const { error } = await admin
    .from("widget_bookings")
    .update({ status: "cancelled", notify_actor: actor })
    .eq("manage_token", token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // WhatsApp confirmation (email is handled by the DB trigger → edge function) —
  // only on the first transition, so a double-cancel doesn't re-message.
  if (!alreadyCancelled) {
    const instance = (data as {
      instance?: {
        config?: unknown;
        owner?: { display_name?: string; username?: string } | null;
      };
    }).instance;
    const config = normalizeCalendarConfig(instance?.config);
    const owner = instance?.owner ?? null;
    const businessName = owner?.display_name || owner?.username || "your provider";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    await dispatchBookingMessage(config.messages.cancellation, {
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      businessName,
      serviceName: booking.service_name,
      startsAt: booking.starts_at,
      timezone: config.timezone,
      priceCents: booking.price_cents,
      currencySymbol: currencySymbol(config.currency),
      manageUrl: `${siteUrl}/booking/${token}`,
      staffName: booking.staff_name ?? null,
    });
  }

  return NextResponse.json({ ok: true, status: "cancelled" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  // `staff_id` is optional: omitted ⇒ keep the booking's current staff (back-compat);
  // "" ⇒ "any available" (auto-assign, mirroring create_booking_tx); a specific id ⇒
  // that specialist, validated against the target slot's free candidates below.
  const { starts_at, staff_id: staffIdRaw } = (await req.json()) as {
    starts_at?: string;
    staff_id?: string | null;
  };
  if (!starts_at) return NextResponse.json({ error: "starts_at is required" }, { status: 400 });

  const { admin, data, error: loadError } = await loadBooking(token);
  if (loadError) return NextResponse.json({ error: "Unable to load booking." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const booking = data as unknown as WidgetBooking;
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "This booking was cancelled." }, { status: 409 });
  }

  const instance = (data as { instance?: { config?: unknown; enabled?: boolean } }).instance;
  if (!instance?.enabled) {
    return NextResponse.json({ error: "Booking widget unavailable." }, { status: 409 });
  }

  const config = normalizeCalendarConfig(instance.config);
  const location = booking.location_id
    ? config.locations.find((l) => l.id === booking.location_id)
    : undefined;
  const services = location ? location.services : config.services;
  const staffSourceForCombine = location ? location.staff : config.staff;

  // Multi-service bookings reschedule as one unit: resolve every booked service
  // and fold them into a combined service (summed duration, intersected staff).
  // The stored `services` breakdown is the source of truth; single-service
  // bookings fall back to `service_id`.
  const bookedServiceIds = booking.services?.map((s) => s.service_id) ?? [booking.service_id];
  const resolvedServices = bookedServiceIds.map((id) => services.find((s) => s.id === id));
  if (resolvedServices.some((s) => !s)) {
    return NextResponse.json({ error: "This service is no longer offered." }, { status: 409 });
  }
  const combined = combineServices(
    resolvedServices as NonNullable<(typeof resolvedServices)[number]>[],
    staffSourceForCombine
  );
  if (!combined) {
    return NextResponse.json({ error: "This service is no longer offered." }, { status: 409 });
  }
  // Preserve the originally reserved span even if the config's durations were
  // edited after the booking was made.
  const service = { ...combined, duration_min: booking.duration_min };

  const requestedIso = new Date(starts_at).toISOString();
  const fromDate = todayInZone(config.timezone, new Date(starts_at));

  // Other confirmed bookings (exclude this one) in the target date's neighborhood,
  // scoped to the same location bucket as the availability route (see its comment).
  let othersQuery = admin
    .from("widget_bookings")
    .select("starts_at, ends_at, staff_id")
    .eq("instance_id", booking.instance_id)
    .eq("status", "confirmed")
    .neq("id", booking.id);
  othersQuery = location
    ? othersQuery.eq("location_id", location.id)
    : othersQuery.is("location_id", null);
  const { data: others } = await othersQuery;

  // Unrestricted (no staffId filter) so each slot's `staff_ids` lists every
  // free-and-eligible candidate — that list doubles as who's available to
  // (re)assign below, the same set create_booking_tx would auto-pick from.
  const slots = computeAvailableSlots({
    config,
    service,
    fromDate,
    days: 2,
    existingBookings: others ?? [],
    minLeadMinutes: 60,
    location,
  });

  const targetSlot = slots.find((s) => s.start === requestedIso);
  if (!targetSlot) {
    return NextResponse.json({ error: "That time isn't available." }, { status: 409 });
  }

  const staffSource = location ? location.staff : config.staff;
  const eligible = eligibleStaffForService(staffSource, service);
  const staffMode = eligible.length > 0;

  // Explicit request wins ("" ⇒ any available); omitted ⇒ keep the current staff.
  const requestedStaffId = staffIdRaw !== undefined ? staffIdRaw || null : booking.staff_id;

  let candidateIds: (string | null)[];
  if (!staffMode) {
    candidateIds = [null];
  } else if (requestedStaffId) {
    if (!targetSlot.staff_ids?.includes(requestedStaffId)) {
      return NextResponse.json(
        { error: "That specialist isn't free at that time." },
        { status: 409 }
      );
    }
    candidateIds = [requestedStaffId];
  } else {
    candidateIds = targetSlot.staff_ids ?? [];
  }

  const newEnds = new Date(new Date(requestedIso).getTime() + service.duration_min * 60_000).toISOString();

  // Record who is rescheduling in the same UPDATE: the DB trigger reads
  // notify_actor to pick the email recipient and fires the edge function itself.
  const actor = await resolveActor(booking.owner_user_id);

  // Try each free candidate in turn — the exclusion constraint rejects one that
  // was just grabbed for an overlapping range, so we fall through to the next
  // (same optimistic-retry shape as create_booking_tx's candidate loop).
  let updated: { starts_at: string; ends_at: string; staff_id: string | null; staff_name: string | null } | null =
    null;
  let lastErrorCode: string | undefined;
  for (const candidateId of candidateIds) {
    const candidateName = candidateId ? staffSource.find((m) => m.id === candidateId)?.name ?? null : null;
    const { data: row, error } = await admin
      .from("widget_bookings")
      .update({ starts_at: requestedIso, ends_at: newEnds, staff_id: candidateId, staff_name: candidateName, notify_actor: actor })
      .eq("manage_token", token)
      .eq("status", "confirmed")
      .select("starts_at, ends_at, staff_id, staff_name")
      .maybeSingle();
    if (!error && row) {
      updated = row;
      break;
    }
    lastErrorCode = (error as { code?: string } | null)?.code;
    if (lastErrorCode !== "23P01") break; // not a slot clash — no point retrying
  }

  if (!updated) {
    // 23P01 = exclusion_violation → every candidate was grabbed first.
    const status = lastErrorCode === "23P01" ? 409 : 500;
    const message = status === 409 ? "That slot was just taken. Please pick another." : "Failed to reschedule.";
    return NextResponse.json({ error: message }, { status });
  }

  // Reschedule email is handled by the DB trigger (it reads the notify_actor we
  // wrote into the UPDATE above) → edge function. Nothing to send from here.
  return NextResponse.json({ ok: true, ...updated });
}
