"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import type { Car } from "@/types/car";

// Dynamic import to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

// Lazy-load leaflet only on client for icon creation
let customIconPromise: Promise<any> | null = null;
async function getCustomIcon() {
  if (!customIconPromise) {
    customIconPromise = import("leaflet").then(L =>
      new L.Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png",
        iconSize: [38, 38],
      })
    );
  }
  return customIconPromise;
}

type CarWithLocation = Car & {
  coords?: { lat: number; lng: number } | null;
  primaryAddress?: string | null;
};

type CarMapProps = {
  cars: CarWithLocation[];
  center?: [number, number];
  zoom?: number;
  height?: number | string;
};

export default function CarMap({ cars, center, zoom = 13, height = 500 }: CarMapProps) {
  const firstWithCoords = cars.find(c => c?.coords && typeof c.coords.lat === "number" && typeof c.coords.lng === "number");
  const mapCenter: [number, number] = center ?? (firstWithCoords ? [firstWithCoords.coords!.lat, firstWithCoords.coords!.lng] : [10.762622, 106.660172]);

  return (
    <div style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%" }}>
      <MapContainer center={mapCenter} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cars.map((car) => {
          if (!car?.coords) return null;
          const pos: [number, number] = [car.coords.lat, car.coords.lng];
          return (
            <MarkerWrapper key={car.id} position={pos} title={car.name} address={car.primaryAddress} />
          );
        })}
      </MapContainer>
    </div>
  );
}

function MarkerWrapper({ position, title, address }: { position: [number, number]; title?: string; address?: string | null }) {
  const [icon, setIcon] = (require("react").useState as typeof import("react").useState<any>)(null);

  (require("react").useEffect as typeof import("react").useEffect)(() => {
    let mounted = true;
    getCustomIcon().then((icn) => {
      if (mounted) setIcon(icn);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!icon) return null;
  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="text-sm">
          <div className="font-semibold">{title ?? "Xe"}</div>
          {address ? <div className="text-gray-600">{address}</div> : null}
        </div>
      </Popup>
    </Marker>
  );
}
