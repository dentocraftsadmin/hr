import { MapPin } from "lucide-react";
import { googleMapsUrl } from "@/lib/location/maps-url";

/**
 * The one "verify this location" control used everywhere CraftsHR shows a
 * recorded lat/lng (a punch, an office). Always takes the exact coordinates
 * that were stored for that specific record — never the viewer's current
 * position — so an old attendance record always opens the place it was
 * actually recorded at, not wherever whoever is looking at it happens to be
 * standing. Renders "Location unavailable" instead of a link when no
 * coordinates exist, rather than guessing or linking somewhere misleading.
 */
export function LocationMapLink({
  latitude,
  longitude,
  label = "View on Google Maps",
  className = "",
}: {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  label?: string;
  className?: string;
}) {
  const lat = latitude == null ? NaN : Number(latitude);
  const lng = longitude == null ? NaN : Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return <span className={`text-xs text-muted-soft ${className}`}>Location unavailable</span>;
  }

  return (
    <a
      href={googleMapsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens the exact location CraftsHR recorded for this event, in Google Maps"
      aria-label={`${label} — the exact location CraftsHR recorded for this event, opens in a new tab`}
      className={`inline-flex items-center gap-1 text-xs font-medium text-primary-strong hover:underline ${className}`}
    >
      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
