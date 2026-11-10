"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { distanceKm, formatDistance, type Coordinates } from "@/lib/geo";
import {
  ROAD_CATEGORIES,
  ROAD_EVENT_CATEGORY,
  isRoadCategory,
  type RoadCategory,
} from "@/lib/project-categories";
import {
  DEFAULT_ROADWORK_RADIUS_KM,
  ROADWORK_RADIUS_OPTIONS_KM,
  ROADWORK_STATUS_DISPLAY,
  deadlineCountdown,
  type RoadworkProject,
} from "@/lib/roadworks";

type LocateState = "idle" | "locating" | "found" | "denied" | "unsupported";

type MapState = "loading" | "ready" | "failed";

type NearbyRoadwork = RoadworkProject & {
  readonly distanceKm: number | null;
};

/** Titik tengah Indonesia, dipakai sebelum lokasi pengguna diketahui. */
const INDONESIA_CENTER: L.LatLngTuple = [-2.5, 118];
const USER_MARKER_COLOR = "#0f172a";
const RADIUS_CIRCLE_COLOR = "#0d6be3";

function formatTargetDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Isi popup dibangun lewat DOM supaya teks dari database tidak dieksekusi sebagai HTML. */
function buildPopupContent(project: NearbyRoadwork): HTMLElement {
  const container = document.createElement("div");
  const status = ROADWORK_STATUS_DISPLAY[project.status];
  const isEvent = project.category === ROAD_EVENT_CATEGORY;

  const category = document.createElement("span");
  category.textContent = project.category;
  category.style.display = "block";
  category.style.color = "#475569";
  category.style.fontSize = "11px";
  category.style.fontWeight = "600";
  container.append(category);

  const title = document.createElement("strong");
  title.textContent = project.title;
  title.style.display = "block";
  title.style.marginBottom = "4px";
  container.append(title);

  const lines = [
    project.locationName,
    isEvent
      ? `Berlangsung sampai ${formatTargetDate(project.targetEndDate)} (${deadlineCountdown(project)})`
      : `${status.label} · progres ${project.progressPercent}%`,
  ];

  if (!isEvent) {
    lines.push(
      `Deadline ${formatTargetDate(project.targetEndDate)}${project.isTargetRevised ? " (direvisi)" : ""} (${deadlineCountdown(project)})`
    );
  }

  if (project.distanceKm !== null) {
    lines.push(`${formatDistance(project.distanceKm)} dari lokasi Anda`);
  }

  for (const text of lines) {
    const line = document.createElement("span");
    line.textContent = text;
    line.style.display = "block";
    line.style.color = "#475569";
    line.style.fontSize = "12px";
    container.append(line);
  }

  const link = document.createElement("a");
  link.href = `/proyek/${project.slug}`;
  link.textContent = "Lihat rincian proyek";
  link.style.display = "inline-block";
  link.style.marginTop = "6px";
  link.style.fontWeight = "600";
  container.append(link);

  return container;
}

function locateMessage(
  locateState: LocateState,
  visibleCount: number,
  radiusKm: number
): string {
  switch (locateState) {
    case "idle":
      return "Menampilkan semua proyek jalan. Pakai lokasi Anda untuk melihat yang paling dekat.";
    case "locating":
      return "Mencari lokasi Anda…";
    case "denied":
      return "Lokasi tidak bisa diakses. Izinkan akses lokasi di browser lalu coba lagi. Sementara ini semua proyek jalan ditampilkan.";
    case "unsupported":
      return "Browser ini tidak mendukung deteksi lokasi, jadi semua proyek jalan ditampilkan.";
    case "found":
      return radiusKm > 0
        ? `${visibleCount} proyek jalan dalam radius ${radiusKm} km dari lokasi Anda.`
        : `${visibleCount} proyek jalan, diurutkan dari yang terdekat.`;
  }
}

export function RoadworksNearby({
  projects,
  loadFailed,
}: {
  readonly projects: readonly RoadworkProject[];
  readonly loadFailed: boolean;
}) {
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [locateState, setLocateState] = useState<LocateState>("idle");
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_ROADWORK_RADIUS_KM);

  const [categoryFilter, setCategoryFilter] = useState<RoadCategory | null>(
    null
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapState, setMapState] = useState<MapState>("loading");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());

  const visibleProjects = useMemo(() => {
    const nearby: NearbyRoadwork[] = [];

    for (const project of projects) {
      if (categoryFilter !== null && project.category !== categoryFilter) {
        continue;
      }

      const distance =
        userPosition === null ? null : distanceKm(userPosition, project);

      if (distance !== null && radiusKm > 0 && distance > radiusKm) {
        continue;
      }

      nearby.push({ ...project, distanceKm: distance });
    }

    if (userPosition !== null) {
      nearby.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return nearby;
  }, [projects, userPosition, radiusKm, categoryFilter]);

  useEffect(() => {
    let isCancelled = false;
    const markers = markersRef.current;

    import("leaflet")
      .then((leafletModule) => {
        if (isCancelled || mapContainerRef.current === null) {
          return;
        }

        const leafletLib = leafletModule.default;

        const map = leafletLib
          .map(mapContainerRef.current, { scrollWheelZoom: false })
          .setView(INDONESIA_CENTER, 5);

        leafletLib
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
            maxZoom: 19,
          })
          .addTo(map);

        leafletRef.current = leafletLib;
        mapRef.current = map;
        layerRef.current = leafletLib.layerGroup().addTo(map);
        setMapState("ready");
      })
      .catch(() => {
        if (!isCancelled) {
          setMapState("failed");
        }
      });

    return () => {
      isCancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const leafletLib = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;

    if (
      mapState !== "ready" ||
      leafletLib === null ||
      map === null ||
      layer === null
    ) {
      return;
    }

    layer.clearLayers();
    markersRef.current.clear();

    const points: L.LatLngTuple[] = [];
    let radiusCircle: L.Circle | null = null;

    if (userPosition !== null) {
      const userPoint: L.LatLngTuple = [userPosition.lat, userPosition.lng];

      if (radiusKm > 0) {
        radiusCircle = leafletLib
          .circle(userPoint, {
            radius: radiusKm * 1000,
            color: RADIUS_CIRCLE_COLOR,
            weight: 1,
            fillOpacity: 0.05,
            interactive: false,
          })
          .addTo(layer);
      }

      leafletLib
        .circleMarker(userPoint, {
          radius: 7,
          color: "#ffffff",
          weight: 3,
          fillColor: USER_MARKER_COLOR,
          fillOpacity: 1,
        })
        .bindTooltip("Lokasi Anda")
        .addTo(layer);

      points.push(userPoint);
    }

    for (const project of visibleProjects) {
      const marker = leafletLib
        .circleMarker([project.lat, project.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: ROADWORK_STATUS_DISPLAY[project.status].markerColor,
          fillOpacity: 1,
        })
        .bindPopup(buildPopupContent(project))
        .on("click", () => setSelectedId(project.id))
        .addTo(layer);

      markersRef.current.set(project.id, marker);
      points.push([project.lat, project.lng]);
    }

    if (radiusCircle !== null) {
      map.fitBounds(radiusCircle.getBounds(), { padding: [24, 24] });
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [32, 32], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [mapState, visibleProjects, userPosition, radiusKm]);

  useEffect(() => {
    const list = listRef.current;

    if (selectedId === null || list === null) {
      return;
    }

    // Hanya gulir di dalam panel daftar (desktop); di mobile daftar tidak punya scroll sendiri.
    if (list.scrollHeight <= list.clientHeight) {
      return;
    }

    document
      .getElementById(`roadwork-${selectedId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  function handleLocate() {
    if (!("geolocation" in navigator)) {
      setLocateState("unsupported");

      return;
    }

    setLocateState("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocateState("found");
      },
      () => setLocateState("denied"),
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  function showOnMap(projectId: string) {
    const map = mapRef.current;
    const marker = markersRef.current.get(projectId);

    setSelectedId(projectId);

    if (map === null || marker === undefined) {
      return;
    }

    if (prefersReducedMotion()) {
      map.setView(marker.getLatLng(), 15, { animate: false });
    } else {
      map.flyTo(marker.getLatLng(), 15, { duration: 0.6 });
    }

    marker.openPopup();
    mapContainerRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  const hasLocation = userPosition !== null;

  return (
    <section aria-labelledby="roadworks-title" className="mb-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id="roadworks-title" className="text-xl font-bold text-slate-900">
            Proyek Jalan di Sekitar Anda
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cek pekerjaan jalan dan transportasi di dekat rute Anda: statusnya,
            progres fisiknya, dan kapan targetnya selesai.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label
              htmlFor="roadworks-category"
              className="mb-1 block font-semibold text-slate-700"
            >
              Jenis
            </label>
            <select
              id="roadworks-category"
              value={categoryFilter ?? ""}
              onChange={(event) => {
                const value = event.target.value;

                setCategoryFilter(isRoadCategory(value) ? value : null);
              }}
              className="min-h-11 max-w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="">Semua jenis</option>
              {ROAD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleLocate}
            disabled={locateState === "locating"}
            className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-4 font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locateState === "locating"
              ? "Mencari lokasi…"
              : hasLocation
                ? "Perbarui lokasi saya"
                : "Gunakan lokasi saya"}
          </button>
        </div>
      </div>

      <p role="status" className="mb-4 text-xs text-slate-600">
        {loadFailed ||
        (projects.length === 0 &&
          (locateState === "idle" || locateState === "found"))
          ? ""
          : locateMessage(locateState, visibleProjects.length, radiusKm)}
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative z-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div
            ref={mapContainerRef}
            className="h-80 w-full sm:h-[440px] lg:h-[480px]"
            aria-label="Peta lokasi proyek jalan"
          />
          {mapState !== "ready" && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-50 px-6 text-center text-xs text-slate-600">
              {mapState === "loading"
                ? "Memuat peta…"
                : "Peta gagal dimuat. Daftar proyek tetap bisa dipakai, atau muat ulang halaman untuk mencoba lagi."}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          {loadFailed ? (
            <div className="p-6 text-center text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                Data proyek jalan gagal dimuat
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Muat ulang halaman untuk mencoba lagi.
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-slate-900">
                Belum ada proyek jalan di peta
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Proyek kategori jalan atau transportasi yang punya titik
                koordinat akan muncul di sini setelah dipublikasikan instansi.
              </p>
            </div>
          ) : visibleProjects.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-slate-900">
                {categoryFilter === null
                  ? `Tidak ada proyek jalan dalam radius ${radiusKm} km`
                  : `Tidak ada proyek ${categoryFilter} yang cocok`}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {categoryFilter === null
                  ? "Perbesar radius untuk melihat proyek yang lebih jauh."
                  : "Pilih jenis lain atau perbesar radius."}
              </p>
            </div>
          ) : (
            <ul
              ref={listRef}
              className="space-y-2 p-2 lg:max-h-[480px] lg:overflow-y-auto"
            >
              {visibleProjects.map((project) => {
                const status = ROADWORK_STATUS_DISPLAY[project.status];
                const isSelected = project.id === selectedId;
                const isEvent = project.category === ROAD_EVENT_CATEGORY;

                const isOverdue =
                  !isEvent &&
                  project.status !== "selesai" &&
                  project.daysToDeadline < 0;

                return (
                  <li
                    key={project.id}
                    id={`roadwork-${project.id}`}
                    className={`rounded-lg border p-3 ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue-light"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold text-slate-600">
                      {project.category}
                    </p>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold leading-snug text-slate-900">
                        <Link
                          href={`/proyek/${project.slug}`}
                          className="rounded hover:text-brand-blue hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        >
                          {project.title}
                        </Link>
                      </h3>
                      {project.distanceKm !== null && (
                        <span className="shrink-0 text-xs font-semibold text-slate-700">
                          {formatDistance(project.distanceKm)}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-600">
                      {project.locationName}
                      {project.agencyName !== null &&
                        ` · ${project.agencyName}`}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      {!isEvent && (
                        <>
                          <span
                            className={`rounded px-2 py-0.5 font-semibold ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                          <span>Progres {project.progressPercent}%</span>
                        </>
                      )}
                    </div>

                    <p
                      className={`mt-2 text-xs ${
                        isOverdue
                          ? "font-semibold text-amber-800"
                          : "text-slate-700"
                      }`}
                    >
                      {isEvent ? "Berlangsung sampai" : "Deadline"}{" "}
                      <span className="font-semibold">
                        {formatTargetDate(project.targetEndDate)}
                      </span>{" "}
                      {project.isTargetRevised && "direvisi "}(
                      {deadlineCountdown(project)})
                    </p>

                    <button
                      type="button"
                      onClick={() => showOnMap(project.id)}
                      disabled={mapState !== "ready"}
                      className="mt-3 min-h-11 w-full cursor-pointer rounded-lg border border-brand-blue/30 bg-white text-xs font-semibold text-brand-blue transition hover:bg-brand-blue-light active:bg-brand-blue/10 focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Tunjukkan di peta
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ul
        aria-label="Keterangan warna penanda"
        className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600"
      >
        {Object.values(ROADWORK_STATUS_DISPLAY).map((status) => (
          <li key={status.label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: status.markerColor }}
            />
            {status.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: USER_MARKER_COLOR }}
          />
          Lokasi Anda
        </li>
      </ul>
    </section>
  );
}
