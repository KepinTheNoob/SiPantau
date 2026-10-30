"use client";

import { useEffect, useRef } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";

export function ProjectMap({
  lat,
  lng,
  title,
  locationName,
}: {
  readonly lat: number | null;
  readonly lng: number | null;
  readonly title: string;
  readonly locationName: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (lat === null || lng === null || mapContainerRef.current === null) {
      return;
    }

    let isCancelled = false;

    void import("leaflet").then((leafletModule) => {
      if (isCancelled || mapContainerRef.current === null) {
        return;
      }

      const leafletLib = leafletModule.default;

      if (mapInstanceRef.current !== null) {
        mapInstanceRef.current.remove();
      }

      const map = leafletLib
        .map(mapContainerRef.current)
        .setView([lat, lng], 13);

      mapInstanceRef.current = map;

      leafletLib
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
          maxZoom: 19,
        })
        .addTo(map);

      const icon = leafletLib.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      leafletLib
        .marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: inherit;"><strong>${title}</strong><br/><span style="color: #64748b; font-size: 11px;">${locationName}</span></div>`
        )
        .openPopup();
    });

    return () => {
      isCancelled = true;

      if (mapInstanceRef.current !== null) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, title, locationName]);

  if (lat === null || lng === null) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
        Titik koordinat peta geografis belum ditentukan untuk proyek ini.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
      <div
        ref={mapContainerRef}
        className="h-72 w-full z-0"
        style={{ minHeight: "288px" }}
      />
    </div>
  );
}
