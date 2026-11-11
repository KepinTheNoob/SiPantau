"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { distanceKm, formatDistance, type Coordinates } from "@/lib/geo";
import {
  ROAD_EVENT_CATEGORY,
  findFilterCategory,
  type ProjectCategoryGroup,
} from "@/lib/project-categories";
import { deadlineCountdown, type RoadworkProject } from "@/lib/roadworks";
import { PROJECT_STATUSES, PROJECT_STATUS_DISPLAY } from "@/lib/project-status";

type LocateState = "idle" | "locating" | "found" | "denied" | "unsupported";

type MapState = "loading" | "ready" | "failed";

type NearbyRoadwork = RoadworkProject & {
  readonly distanceKm: number | null;
};

/** Titik tengah Indonesia, dipakai sebelum lokasi pengguna diketahui. */
const INDONESIA_CENTER: L.LatLngTuple = [-2.5, 118];
const USER_MARKER_COLOR = "#0f172a";

/** Zoom setelah peta dipusatkan ke lokasi pengguna (kira-kira skala lingkungan/kelurahan). */
const USER_LOCATION_ZOOM = 14;

const SELECT_CLASS =
  "min-h-11 max-w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:text-xs";

function formatTargetDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Satu baris teks popup; teks dari database diisi lewat textContent (aman dari HTML). */
function popupLine(text: string, emphasis = false): HTMLSpanElement {
  const line = document.createElement("span");

  line.textContent = text;
  line.style.display = "block";
  line.style.fontSize = "12px";
  line.style.lineHeight = "1.45";
  line.style.color = emphasis ? "#0f172a" : "#475569";
  line.style.fontWeight = emphasis ? "600" : "400";

  return line;
}

/** Popup penanda: semua informasi proyek yang dulu tampil di daftar samping peta. */
function buildPopupContent(project: NearbyRoadwork): HTMLElement {
  const container = document.createElement("div");
  const status = PROJECT_STATUS_DISPLAY[project.status];
  const isEvent = project.category === ROAD_EVENT_CATEGORY;

  container.style.minWidth = "200px";
  container.style.maxWidth = "260px";

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
  title.style.margin = "2px 0 6px";
  title.style.fontSize = "14px";
  title.style.lineHeight = "1.35";
  container.append(title);

  container.append(popupLine(project.locationName));

  if (project.agencyName !== null) {
    container.append(popupLine(project.agencyName));
  }

  if (project.distanceKm !== null) {
    container.append(
      popupLine(`${formatDistance(project.distanceKm)} dari lokasi Anda`)
    );
  }

  if (isEvent) {
    container.append(
      popupLine(
        `Berlangsung sampai ${formatTargetDate(project.targetEndDate)} (${deadlineCountdown(project)})`,
        true
      )
    );
  } else {
    const statusLine = popupLine(
      `${status.label} · progres ${project.progressPercent}%`,
      true
    );

    // Teks tetap gelap agar terbaca; warna status cukup lewat titik penanda.
    const statusDot = document.createElement("span");
    statusDot.setAttribute("aria-hidden", "true");
    statusDot.style.display = "inline-block";
    statusDot.style.width = "8px";
    statusDot.style.height = "8px";
    statusDot.style.borderRadius = "9999px";
    statusDot.style.marginRight = "6px";
    statusDot.style.backgroundColor = status.markerColor;
    statusLine.prepend(statusDot);
    statusLine.style.marginTop = "4px";
    container.append(statusLine);
    container.append(
      popupLine(
        `Target ${formatTargetDate(project.targetEndDate)}${project.isTargetRevised ? " (direvisi)" : ""} · ${deadlineCountdown(project)}`
      )
    );
  }

  const link = document.createElement("a");

  link.href = `/proyek/${project.slug}`;
  link.textContent = "Lihat rincian proyek";
  link.style.display = "inline-block";
  link.style.marginTop = "8px";
  link.style.padding = "6px 0";
  link.style.fontWeight = "600";
  container.append(link);

  return container;
}

/** Penanda berbentuk titik yang bisa difokus keyboard (Tab) dan dibuka dengan Enter. */
function pinIcon(leafletLib: typeof L, color: string): L.DivIcon {
  return leafletLib.divIcon({
    className: "",
    html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.45)"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

function locateMessage(locateState: LocateState, visibleCount: number): string {
  switch (locateState) {
    case "idle":
      return `${visibleCount} proyek di peta. Pakai lokasi Anda untuk melihat yang paling dekat.`;
    case "locating":
      return "Mencari lokasi Anda…";
    case "denied":
      return "Lokasi tidak bisa diakses. Izinkan akses lokasi di browser lalu coba lagi. Sementara ini semua proyek ditampilkan.";
    case "unsupported":
      return "Browser ini tidak mendukung deteksi lokasi, jadi semua proyek ditampilkan.";
    case "found":
      return `${visibleCount} proyek di peta. Peta dipusatkan ke lokasi Anda; geser untuk melihat sekitar.`;
  }
}

export function RoadworksNearby({
  projects,
  categoryGroups,
  loadFailed,
}: {
  readonly projects: readonly RoadworkProject[];
  readonly categoryGroups: readonly ProjectCategoryGroup[];
  readonly loadFailed: boolean;
}) {
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [locateState, setLocateState] = useState<LocateState>("idle");

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [mapState, setMapState] = useState<MapState>("loading");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const visibleProjects = useMemo(() => {
    const nearby: NearbyRoadwork[] = [];

    for (const project of projects) {
      if (categoryFilter !== null && project.category !== categoryFilter) {
        continue;
      }

      const distance =
        userPosition === null ? null : distanceKm(userPosition, project);

      nearby.push({ ...project, distanceKm: distance });
    }

    return nearby;
  }, [projects, userPosition, categoryFilter]);

  useEffect(() => {
    let isCancelled = false;

    import("leaflet")
      .then((leafletModule) => {
        if (isCancelled || mapContainerRef.current === null) {
          return;
        }

        const leafletLib = leafletModule.default;

        // Di layar sentuh, satu jari menggulir halaman dan dua jari menggeser/zoom peta,
        // supaya peta besar tidak "menjebak" scroll.
        const map = leafletLib
          .map(mapContainerRef.current, {
            scrollWheelZoom: false,
            dragging: !leafletLib.Browser.mobile,
          })
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

    const points: L.LatLngTuple[] = [];
    let userPoint: L.LatLngTuple | null = null;

    if (userPosition !== null) {
      userPoint = [userPosition.lat, userPosition.lng];

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
    }

    for (const project of visibleProjects) {
      const status = PROJECT_STATUS_DISPLAY[project.status];

      const marker = leafletLib
        .marker([project.lat, project.lng], {
          icon: pinIcon(leafletLib, status.markerColor),
          title: project.title,
          keyboard: true,
          riseOnHover: true,
        })
        .bindPopup(buildPopupContent(project), { maxWidth: 280 })
        .addTo(layer);

      marker
        .getElement()
        ?.setAttribute(
          "aria-label",
          `${project.title}, ${status.label}. Tekan Enter untuk detail.`
        );

      points.push([project.lat, project.lng]);
    }

    if (userPoint !== null) {
      map.setView(userPoint, USER_LOCATION_ZOOM);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [mapState, visibleProjects, userPosition]);

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

  const hasLocation = userPosition !== null;

  const emptyNotice = loadFailed
    ? {
        title: "Data proyek gagal dimuat",
        body: "Muat ulang halaman untuk mencoba lagi.",
      }
    : projects.length === 0
      ? {
          title: "Belum ada proyek di peta",
          body: "Proyek yang punya titik koordinat akan muncul setelah dipublikasikan instansi.",
        }
      : visibleProjects.length === 0
        ? {
            title: `Belum ada proyek kategori ${categoryFilter ?? "ini"} di peta`,
            body: "Pilih kategori lain untuk melihat proyek lainnya.",
          }
        : null;

  return (
    <section aria-labelledby="roadworks-title" className="mb-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id="roadworks-title" className="text-xl font-bold text-slate-900">
            Proyek di Sekitar Anda
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Ketuk titik di peta untuk melihat status, progres, dan kapan target
            selesainya.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label
              htmlFor="roadworks-category"
              className="mb-1 block font-semibold text-slate-700"
            >
              Kategori
            </label>
            <select
              id="roadworks-category"
              value={categoryFilter ?? ""}
              onChange={(event) => {
                const value = event.target.value;

                setCategoryFilter(
                  findFilterCategory(categoryGroups, value) ?? null
                );
              }}
              className={SELECT_CLASS}
            >
              <option value="">Semua kategori</option>
              {categoryGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleLocate}
            disabled={locateState === "locating"}
            className="min-h-11 cursor-pointer rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-blue-hover active:bg-brand-blue-hover/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
          >
            {locateState === "locating"
              ? "Mencari lokasi…"
              : hasLocation
                ? "Perbarui lokasi saya"
                : "Gunakan lokasi saya"}
          </button>
        </div>
      </div>

      <p role="status" className="mb-3 text-xs text-slate-600">
        {emptyNotice !== null
          ? ""
          : locateMessage(locateState, visibleProjects.length)}
      </p>

      {emptyNotice !== null && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">
            {emptyNotice.title}
          </p>
          <p className="mt-1 text-xs text-slate-600">{emptyNotice.body}</p>
        </div>
      )}

      <div className="relative z-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div
          ref={mapContainerRef}
          className="h-[65vh] max-h-[720px] min-h-80 w-full"
          aria-label="Peta lokasi proyek jalan"
        />
        {mapState !== "ready" && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-50 px-6 text-center text-sm text-slate-600">
            {mapState === "loading"
              ? "Memuat peta…"
              : "Peta gagal dimuat. Muat ulang halaman untuk mencoba lagi."}
          </div>
        )}
      </div>

      <p className="mt-2 hidden text-xs text-slate-600 [@media(pointer:coarse)]:block">
        Geser dan perbesar peta dengan dua jari.
      </p>

      <ul
        aria-label="Keterangan warna penanda"
        className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600"
      >
        {PROJECT_STATUSES.map((value) => {
          const status = PROJECT_STATUS_DISPLAY[value];

          return (
            <li key={value} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: status.markerColor }}
              />
              <span>
                <span className="font-semibold text-slate-700">
                  {status.label}
                </span>
                : {status.description.toLowerCase()}
              </span>
            </li>
          );
        })}
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
