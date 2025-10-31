// src/utils/geocode.ts
export type GeocodeResult = { lat: number; lng: number };

// Simple in-memory cache to reduce repeated lookups
const geocodeCache = new Map<string, GeocodeResult | null>();

// Normalize common VN address abbreviations and add country for better accuracy
function normalizeAddress(raw: string): { query: string; preferVN: boolean } {
  let s = (raw || '').trim();
  let preferVN = false;

  // Expand common abbreviations for Ho Chi Minh City
  s = s
    .replace(/\bTP\.?\s*HCM\b/gi, 'Ho Chi Minh City')
    .replace(/\bHCM\b/gi, 'Ho Chi Minh City')
    .replace(/\bTP\.?\s*Hồ Chí Minh\b/gi, 'Ho Chi Minh City');

  // Tan Son Nhat naming
  s = s.replace(/Tan Son Nhat Airport/gi, 'Tan Son Nhat International Airport');

  // If it mentions Ho Chi Minh City or looks Vietnamese, prefer Vietnam country filter
  if (/Ho Chi Minh City|Hà Nội|Da Nang|Hải Phòng|Việt Nam|Vietnam/i.test(s)) {
    preferVN = true;
  }

  // Ensure country if not present and it's likely VN context
  if (preferVN && !/Vietnam|Việt Nam/i.test(s)) {
    s = `${s}, Vietnam`;
  }

  return { query: s, preferVN };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const { query, preferVN } = normalizeAddress(address);

    // Check cache
    if (geocodeCache.has(query)) {
      return geocodeCache.get(query) ?? null;
    }

    const base = 'https://nominatim.openstreetmap.org/search';
    const paramsVN = `format=json&limit=1&addressdetails=0&countrycodes=vn&q=${encodeURIComponent(query)}`;
    const paramsAny = `format=json&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`;

    // First try with VN filter if applicable, then fallback
    const urls = preferVN ? [`${base}?${paramsVN}`, `${base}?${paramsAny}`] : [`${base}?${paramsAny}`];

    let result: GeocodeResult | null = null;

    for (const url of urls) {
      const res = await fetch(url, {
      headers: {
        // Optional headers for better compatibility with Nominatim
        "Accept": "application/json",
      },
      });
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        break;
      }
    }

    // Cache and return
    geocodeCache.set(query, result);
    return result;
  } catch (error) {
    console.error("Geocode failed:", error);
    return null;
  }
}

export default geocodeAddress;
