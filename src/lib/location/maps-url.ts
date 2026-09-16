/**
 * The one place a Google Maps link is built from a recorded lat/lng, so the
 * URL format never drifts between the UI and the .xlsx exports. Uses the
 * documented api=1 "search" Maps URL — no API key required, and it's the
 * same universal link Google recommends for cross-platform behavior: on a
 * phone with the Google Maps app installed, the OS intercepts it and opens
 * the app directly; otherwise (desktop, or no app) it opens the Maps
 * website. No user-agent sniffing needed to get that behavior.
 */
export function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
