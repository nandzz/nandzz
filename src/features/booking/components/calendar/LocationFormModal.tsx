"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarCropModal } from "@/components/ui/AvatarCropModal";
import type { Location, WeekdayKey } from "@/lib/types";
import { getCurrentUserId, uploadLocationPhoto } from "@/features/booking/storage";
import { LocationEditor } from "@/features/booking/components/calendar/LocationEditor";
import { useLanguage } from "@/contexts/LanguageContext";

// Photo files must be under this size (mirrors LocationManager/StaffManager).
const MAX_LOCATION_PHOTO_SIZE = 1.5 * 1024 * 1024;

interface Props {
  // The location being edited. For a brand-new location this is a fresh draft
  // that does NOT yet exist in config — it's only committed on save, so the
  // parent's config (and the gate/dashboard routing that keys off
  // `locations.length`) never changes mid-edit.
  location: Location;
  isNew: boolean;
  saving: boolean;
  // A save error to surface in the modal (e.g. a validation failure) — the modal
  // stays open on a failed save so the owner can fix it.
  errorMsg?: string | null;
  onSave: (location: Location) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

// Focused, self-contained editor for a single location's identity + hours +
// days off, shown as a modal so creating/editing a location is a deliberate,
// guided task instead of an inline navigation that swaps the whole screen.
// Edits accumulate on a LOCAL draft copy; nothing reaches the shared config
// until the owner presses Save (Cancel/close discards them).
export function LocationFormModal({ location, isNew, saving, errorMsg, onSave, onDelete, onClose }: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Location>(location);

  // Photo upload: hidden input → crop modal → Supabase Storage → draft.photo_url.
  const photoInputRef = useRef<HTMLInputElement>(null);
  const ownerIdRef = useRef<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // ── draft mutators (mirror LocationManager's config helpers, over local state) ──
  function updateFields(fields: Partial<Location>) {
    setDraft((d) => ({ ...d, ...fields }));
  }
  function addWindow(_id: string, day: WeekdayKey) {
    setDraft((d) => ({
      ...d,
      availability: {
        ...d.availability,
        [day]: [...(d.availability[day] ?? []), ["09:00", "17:00"] as [string, string]],
      },
    }));
  }
  function updateWindow(_id: string, day: WeekdayKey, idx: number, which: 0 | 1, value: string) {
    setDraft((d) => ({
      ...d,
      availability: {
        ...d.availability,
        [day]: (d.availability[day] ?? []).map((w, i) =>
          i === idx ? ((which === 0 ? [value, w[1]] : [w[0], value]) as [string, string]) : w
        ),
      },
    }));
  }
  function removeWindow(_id: string, day: WeekdayKey, idx: number) {
    setDraft((d) => ({
      ...d,
      availability: {
        ...d.availability,
        [day]: (d.availability[day] ?? []).filter((_, i) => i !== idx),
      },
    }));
  }
  function addDayOff(_id: string, date: string) {
    setDraft((d) => ({ ...d, blackout_dates: [...(d.blackout_dates ?? []), date].sort() }));
  }
  function removeDayOff(_id: string, date: string) {
    setDraft((d) => ({ ...d, blackout_dates: (d.blackout_dates ?? []).filter((x) => x !== date) }));
  }

  // ── photo upload ──
  function openPhotoPicker() {
    setPhotoError(null);
    photoInputRef.current?.click();
  }
  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_LOCATION_PHOTO_SIZE) {
      setPhotoError(t.booking.photoTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }
  async function handleCroppedPhoto(blob: Blob) {
    setCropImageSrc(null);
    setUploading(true);
    setPhotoError(null);
    try {
      // Location photos live under the owner's auth uid (Storage RLS on
      // `avatars` requires the first path segment to equal it); cache-busted.
      let ownerId = ownerIdRef.current;
      if (!ownerId) {
        ownerId = await getCurrentUserId();
        ownerIdRef.current = ownerId;
      }
      if (!ownerId) throw new Error(t.booking.notSignedIn);
      const photoUrl = await uploadLocationPhoto(ownerId, draft.id, blob);
      updateFields({ photo_url: photoUrl });
    } catch (err) {
      console.error("[location] photo upload failed:", err);
      setPhotoError(t.booking.errorUploadPhoto);
    } finally {
      setUploading(false);
    }
  }

  const title = isNew
    ? t.booking.newLocation
    : t.booking.editLocationAria.replace("{name}", draft.name || t.booking.unnamedLocation);

  return (
    <Dialog open onClose={onClose} title={title} maxWidthClass="max-w-xl">
      {/* Shared photo picker + crop modal (crop layers above this dialog). */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handlePhotoFileChange}
      />
      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onCancel={() => setCropImageSrc(null)}
          onCrop={handleCroppedPhoto}
        />
      )}

      {photoError && <p className="mb-3 text-xs text-red-600">{photoError}</p>}

      {/* Scrollable body so the full form never blows past the viewport. */}
      <div className="-mx-1 max-h-[65vh] overflow-y-auto px-1">
        <LocationEditor
          location={draft}
          uploading={uploading}
          inModal
          onOpenPhotoPicker={openPhotoPicker}
          onUpdate={(_id, fields) => updateFields(fields)}
          onRemove={() => {}}
          onAddWindow={addWindow}
          onUpdateWindow={updateWindow}
          onRemoveWindow={removeWindow}
          onAddDayOff={addDayOff}
          onRemoveDayOff={removeDayOff}
        />
      </div>

      {errorMsg && <p className="mt-3 text-xs text-red-600">{errorMsg}</p>}

      {/* Footer — Delete (existing only) on the left, Save on the right. The
          Dialog header's ✕ / backdrop click acts as Cancel (discards the draft). */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        {isNew ? (
          <span />
        ) : (
          <Button variant="destructive" size="sm" onClick={() => onDelete(draft.id)} disabled={saving}>
            <Trash2 className="h-4 w-4" /> {t.booking.deleteLocation}
          </Button>
        )}
        <Button onClick={() => onSave(draft)} disabled={saving || uploading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isNew ? t.booking.createLocation : t.booking.saveChanges}
        </Button>
      </div>
    </Dialog>
  );
}
