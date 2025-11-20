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
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const res = await fetch(url, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "EV_Rental_App/1.0", // Nominatim requires User-Agent
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          console.warn(`Geocode API returned ${res.status} for ${url}`);
          continue; // Try next URL
        }

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          break;
        }
      } catch (fetchError: any) {
        // Handle abort (timeout) or network errors gracefully
        if (fetchError.name === 'AbortError') {
          console.warn(`Geocode timeout for ${url}`);
        } else {
          console.warn(`Geocode fetch error for ${url}:`, fetchError);
        }
        // Continue to next URL or return null if last attempt
        continue;
      }
    }

    // Cache and return (even if null, to avoid repeated failed attempts)
    geocodeCache.set(query, result);
    return result;
  } catch (error) {
    // Catch any unexpected errors and return null gracefully
    console.error("Geocode failed:", error);
    return null;
  }
}

export default geocodeAddress;
