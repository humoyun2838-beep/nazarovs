export type GeoPlace = {
  country: string;
  region: string;
  city: string;
  lat: string;
  lon: string;
  address: string;
};

function isPublicIp(ip: string) {
  const value = String(ip || "").trim().toLowerCase();
  if (!value || value === "::1" || value === "localhost") return false;
  if (
    value.startsWith("127.") ||
    value.startsWith("10.") ||
    value.startsWith("192.168.") ||
    value.startsWith("169.254.")
  ) {
    return false;
  }
  const m = value.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return false;
  }
  return true;
}

function joinAddress(parts: Array<string | undefined>) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part, i, all) => all.indexOf(part) === i)
    .join(", ");
}

async function googleFormattedAddress(lat: number, lon: number) {
  const key = process.env.GOOGLE_MAPS_API_KEY || "";
  if (!key) return "";
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${encodeURIComponent(key)}&language=uz`;
  const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
  const data = (await res.json().catch(() => null)) as {
    results?: Array<{ formatted_address?: string }>;
  } | null;
  return data?.results?.[0]?.formatted_address || "";
}

export async function lookupIpPlace(ip: string): Promise<GeoPlace | null> {
  if (!isPublicIp(ip)) return null;
  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region,city,latitude,longitude,connection`,
      { signal: AbortSignal.timeout(2500) },
    );
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      connection?: { isp?: string };
    } | null;
    if (!data?.success) return null;
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    const latText = Number.isFinite(lat) ? String(lat) : "";
    const lonText = Number.isFinite(lon) ? String(lon) : "";
    let address = joinAddress([data.city, data.region, data.country]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const google = await googleFormattedAddress(lat, lon).catch(() => "");
      if (google) address = google;
    }
    if (!address && !latText) return null;
    return {
      country: data.country || "",
      region: data.region || "",
      city: data.city || "",
      lat: latText,
      lon: lonText,
      address: address.slice(0, 220),
    };
  } catch {
    return null;
  }
}

export function googleMapsSearchUrl(lat: string, lon: string, address = "") {
  const query =
    lat && lon ? `${lat},${lon}` : address;
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsEmbedUrl(lat: string, lon: string, address = "") {
  const query = lat && lon ? `${lat},${lon}` : address;
  if (!query) return "";
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=12&hl=uz&output=embed`;
}
