"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import maplibregl, { type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Activity,
  CalendarClock,
  ExternalLink,
  HeartHandshake,
  Home,
  MapPin,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SAN_POLICARPO_CENTER: [number, number] = [125.5072, 12.1792];

const SAN_POLICARPO_LIMITS = {
  south: 12.125,
  west: 125.375,
  north: 12.285,
  east: 125.625,
};

const SAN_POLICARPO_BOUNDS: [[number, number], [number, number]] = [
  [SAN_POLICARPO_LIMITS.west, SAN_POLICARPO_LIMITS.south],
  [SAN_POLICARPO_LIMITS.east, SAN_POLICARPO_LIMITS.north],
];

const MAP_TRANSITION_MS = 420;

type MapTheme =
  "coolGray" | "blueprint" | "emeraldMist" | "darkMode" | "satellite";

// Change this value to switch the whole map color design.
// Options: 'coolGray', 'blueprint', 'emeraldMist', 'darkMode', 'satellite'
const MAP_THEME: MapTheme = "blueprint";

const MAP_THEMES: Record<
  MapTheme,
  {
    sourceId: string;
    layerId: string;
    tiles: string[];
    attribution: string;
    paint: Record<string, number>;
  }
> = {
  coolGray: {
    sourceId: "cartoLight",
    layerId: "carto-light-base",
    tiles: [
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    ],
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    paint: {
      "raster-opacity": 1,
      "raster-saturation": -0.55,
      "raster-contrast": 0.06,
      "raster-brightness-min": 0.04,
      "raster-brightness-max": 0.98,
    },
  },
  blueprint: {
    sourceId: "cartoVoyager",
    layerId: "carto-voyager-blueprint",
    tiles: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    ],
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    paint: {
      "raster-opacity": 1,
      "raster-saturation": -0.25,
      "raster-contrast": 0.02,
      "raster-brightness-min": 0.02,
      "raster-brightness-max": 0.95,
    },
  },
  emeraldMist: {
    sourceId: "cartoLightEmerald",
    layerId: "carto-light-emerald",
    tiles: [
      "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    ],
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    paint: {
      "raster-opacity": 1,
      "raster-saturation": -0.35,
      "raster-contrast": 0.03,
      "raster-brightness-min": 0.06,
      "raster-brightness-max": 1,
      "raster-hue-rotate": 18,
    },
  },
  darkMode: {
    sourceId: "cartoDark",
    layerId: "carto-dark-base",
    tiles: [
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    ],
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    paint: {
      "raster-opacity": 0.96,
      "raster-saturation": -0.2,
      "raster-contrast": 0.06,
      "raster-brightness-min": 0.02,
      "raster-brightness-max": 0.86,
    },
  },
  satellite: {
    sourceId: "esriWorldImagery",
    layerId: "esri-world-imagery",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    attribution: "Tiles &copy; Esri",
    paint: {
      "raster-opacity": 0.9,
      "raster-saturation": -0.12,
      "raster-contrast": 0.02,
      "raster-brightness-min": 0.04,
      "raster-brightness-max": 0.94,
    },
  },
};

function createMapStyle(themeName: MapTheme) {
  const theme = MAP_THEMES[themeName];

  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      [theme.sourceId]: {
        type: "raster",
        tiles: theme.tiles,
        tileSize: 256,
        attribution: theme.attribution,
      },
    },
    layers: [
      {
        id: theme.layerId,
        type: "raster",
        source: theme.sourceId,
        paint: theme.paint,
      },
    ],
  } as any;
}

function isWithinSanPolicarpo(latitude: number, longitude: number) {
  return (
    latitude >= SAN_POLICARPO_LIMITS.south &&
    latitude <= SAN_POLICARPO_LIMITS.north &&
    longitude >= SAN_POLICARPO_LIMITS.west &&
    longitude <= SAN_POLICARPO_LIMITS.east
  );
}

export interface VulnerablePoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  barangay: string;
  address: string;
  vulnerabilityTypes?: string[];
  hasReceivedRelief?: boolean;
  needsAssistance?: boolean;
  mobileNumber?: string;
  phone?: string;
  profileUrl?: string | null;
  profilePhoto?: string | null;
  profilePicture?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  age?: number | string | null;
  gender?: string | null;
  civilStatus?: string | null;
  lastDistributionDate?: string | null;
  lastDistributionType?: string | null;
  lastItemsReceived?: string | null;
  lastReliefStatus?: string | null;
  missingNeeds?: string[] | string | null;
  assistanceType?: string | null;
}

interface VulnerableMapProps {
  points: VulnerablePoint[];
  height?: number;
  onViewProfile?: (profileId: string, point: VulnerablePoint) => void;
  interactiveMarkers?: boolean;
}

type PointStatus = {
  label: string;
  color: string;
  softColor: string;
  textColor: string;
  ringColor: string;
};

function formatVulnerability(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPointStatus(point: VulnerablePoint): PointStatus {
  if (point.needsAssistance) {
    return {
      label: "Needs assistance",
      color: "#dc2626",
      softColor: "#fee2e2",
      textColor: "#991b1b",
      ringColor: "#fecaca",
    };
  }

  if (point.hasReceivedRelief) {
    return {
      label: "Relief received",
      color: "#059669",
      softColor: "#d1fae5",
      textColor: "#065f46",
      ringColor: "#a7f3d0",
    };
  }

  return {
    label: "No relief yet",
    color: "#d97706",
    softColor: "#fef3c7",
    textColor: "#92400e",
    ringColor: "#fde68a",
  };
}

function getProfilePhoto(point: VulnerablePoint) {
  return (
    point.profilePhoto ||
    point.profilePicture ||
    point.image ||
    point.avatarUrl ||
    null
  );
}

function getMobileNumber(point: VulnerablePoint) {
  return point.mobileNumber || point.phone || "09067072092";
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "VC"
  );
}

function formatMaybeDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getAge(point: VulnerablePoint) {
  if (point.age) return String(point.age);
  if (!point.dateOfBirth) return "Not recorded";

  const birthDate = new Date(point.dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "Not recorded";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return String(age);
}

function normalizeMissingNeeds(value: VulnerablePoint["missingNeeds"]) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSpecificNeeds(point: VulnerablePoint) {
  const needs = normalizeMissingNeeds(point.missingNeeds);

  if (point.assistanceType) {
    needs.unshift(point.assistanceType);
  }

  if (!needs.length && point.needsAssistance) {
    needs.push("Immediate assistance review");
  }

  return needs.length ? needs : ["No specific needs recorded"];
}

function createMarkerElement(point: VulnerablePoint, isSelected: boolean) {
  const status = getPointStatus(point);
  const element = document.createElement("button");

  element.type = "button";
  element.className = "crms-maplibre-marker";
  element.setAttribute("aria-label", `${point.name}: ${status.label}`);
  element.style.setProperty("--marker-color", status.color);
  element.style.setProperty("--marker-soft", status.softColor);
  element.style.setProperty("--marker-ring", status.ringColor);

  if (isSelected) {
    element.classList.add("crms-maplibre-marker--selected");
  }

  element.innerHTML = `
    <span class="crms-maplibre-marker__pin">
      <span class="crms-maplibre-marker__inner"></span>
    </span>
    <span class="crms-maplibre-marker__shadow"></span>
  `;

  return element;
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-600">{icon}</div>
      <p className="mt-3 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function ProfileDrawer({
  point,
  onClose,
  onViewProfile,
}: {
  point: VulnerablePoint | null;
  onClose: () => void;
  onViewProfile?: (profileId: string, point: VulnerablePoint) => void;
}) {
  const status = point ? getPointStatus(point) : null;
  const profilePhoto = point ? getProfilePhoto(point) : null;
  const vulnerabilities = point?.vulnerabilityTypes?.length
    ? point.vulnerabilityTypes.map(formatVulnerability)
    : ["Not specified"];
  const specificNeeds = point ? getSpecificNeeds(point) : [];

  return (
    <aside
      className={`h-full min-h-0 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        point
          ? "translate-x-0 opacity-100 lg:w-[30%] lg:min-w-[340px]"
          : "pointer-events-none translate-x-7 opacity-0 lg:w-0 lg:min-w-0"
      }`}
      aria-hidden={!point}
    >
      {point && status && (
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative shrink-0 overflow-hidden border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,#ffffff,#f8fafc)] p-5">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              aria-label="Close profile panel"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-12">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
                style={{
                  backgroundColor: status.softColor,
                  color: status.textColor,
                }}
              >
                {status.label}
              </span>

              <div className="mt-5 flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-slate-900 text-lg font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)]">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={point.name}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{getInitials(point.name)}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Registered Citizen
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">
                    {point.name || "Unnamed citizen"}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {point.barangay || "Barangay not recorded"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <InfoCard
                icon={<Phone className="h-4 w-4" />}
                label="Mobile Number"
                value={getMobileNumber(point)}
              />
              <InfoCard
                icon={<UserRound className="h-4 w-4" />}
                label="Age"
                value={getAge(point)}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Home className="h-4 w-4 text-emerald-600" />
                Location Details
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">
                {point.address || "No address recorded"}
              </p>
              <div className="mt-3 grid gap-2 rounded-xl bg-white p-3 text-xs font-semibold text-slate-500 shadow-sm">
                <span>
                  Latitude:{" "}
                  <strong className="text-slate-900">
                    {point.latitude.toFixed(6)}
                  </strong>
                </span>
                <span>
                  Longitude:{" "}
                  <strong className="text-slate-900">
                    {point.longitude.toFixed(6)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <HeartHandshake className="h-4 w-4 text-red-600" />
                Specific Needs
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {specificNeeds.map((need) => (
                  <span
                    key={need}
                    className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Activity className="h-4 w-4 text-emerald-600" />
                Vulnerability Background
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {vulnerabilities.map((vulnerability) => (
                  <span
                    key={vulnerability}
                    className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    {vulnerability}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <CalendarClock className="h-4 w-4 text-amber-600" />
                Relief History
              </div>
              <div className="mt-3 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Last Distribution
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatMaybeDate(point.lastDistributionDate)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Items / Type
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {point.lastItemsReceived ||
                      point.lastDistributionType ||
                      "Not recorded"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-5">
            {onViewProfile ? (
              <Button
                type="button"
                onClick={() => onViewProfile(point.id, point)}
                className="w-full gap-2 rounded-2xl bg-emerald-600 font-semibold hover:bg-emerald-700"
              >
                <ExternalLink className="h-4 w-4" />
                View full profile
              </Button>
            ) : point.profileUrl ? (
              <a
                href={point.profileUrl}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <ExternalLink className="h-4 w-4" />
                View full profile
              </a>
            ) : null}
          </div>
        </div>
      )}
    </aside>
  );
}

export function VulnerableMap({
  points,
  height = 500,
  onViewProfile,
  interactiveMarkers = true,
}: VulnerableMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const markerElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<VulnerablePoint | null>(
    null,
  );

  const validPoints = useMemo(() => {
    return points.filter((point) => {
      return (
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        isWithinSanPolicarpo(point.latitude, point.longitude)
      );
    });
  }, [points]);

  const selectedPointId = selectedPoint?.id ?? null;

  const stats = useMemo(() => {
    return {
      total: validPoints.length,
      needsAssistance: validPoints.filter((point) => point.needsAssistance)
        .length,
      noReliefYet: validPoints.filter(
        (point) => !point.needsAssistance && !point.hasReceivedRelief,
      ).length,
      reliefReceived: validPoints.filter(
        (point) => !point.needsAssistance && point.hasReceivedRelief,
      ).length,
    };
  }, [validPoints]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(MAP_THEME),
      center: SAN_POLICARPO_CENTER,
      zoom: 12.35,
      minZoom: 10.5,
      maxZoom: 18,
      maxBounds: SAN_POLICARPO_BOUNDS,
      attributionControl: false,
      preserveDrawingBuffer: false,
      fadeDuration: 0,
      dragRotate: false,
      pitchWithRotate: false,
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      "bottom-right",
    );

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "OpenStreetMap contributors · CARTO",
      }),
      "bottom-left",
    );

    map.on("load", () => {
      setMapReady(true);
      window.requestAnimationFrame(() => map.resize());
      window.setTimeout(() => map.resize(), 120);
    });

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => map.resize());
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      markerElementsRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    markerElementsRef.current.clear();

    validPoints.forEach((point) => {
      const element = createMarkerElement(point, false);
      markerElementsRef.current.set(point.id, element);

      if (interactiveMarkers) {
        element.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setSelectedPoint(point);
        });
      } else {
        element.setAttribute("aria-hidden", "true");
        element.style.pointerEvents = "none";
        element.style.cursor = "default";
      }

      const marker = new maplibregl.Marker({
        element,
        anchor: "bottom",
      })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (validPoints.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      validPoints.forEach((point) =>
        bounds.extend([point.longitude, point.latitude]),
      );

      map.fitBounds(bounds, {
        padding: { top: 120, bottom: 80, left: 120, right: 140 },
        maxZoom: 14.2,
        duration: 0,
      });
    } else {
      map.jumpTo({ center: SAN_POLICARPO_CENTER, zoom: 12.35 });
    }

    window.requestAnimationFrame(() => map.resize());
  }, [interactiveMarkers, mapReady, validPoints]);

  useEffect(() => {
    markerElementsRef.current.forEach((element, pointId) => {
      element.classList.toggle(
        "crms-maplibre-marker--selected",
        pointId === selectedPointId,
      );
    });
  }, [selectedPointId]);

  useEffect(() => {
    if (!selectedPoint) return;

    const stillExists = validPoints.some(
      (point) => point.id === selectedPoint.id,
    );

    if (!stillExists) {
      setSelectedPoint(null);
    }
  }, [selectedPoint, validPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.stop();

    const resizeOnly = () => {
      map.resize();
    };

    const resizeAndCenter = () => {
      map.resize();

      if (selectedPoint) {
        map.easeTo({
          center: [selectedPoint.longitude, selectedPoint.latitude],
          zoom: Math.max(map.getZoom(), 13.05),
          duration: 360,
          essential: true,
        });
      }
    };

    window.requestAnimationFrame(resizeOnly);
    const timers = [80, 220, MAP_TRANSITION_MS + 60].map((delay) =>
      window.setTimeout(resizeOnly, delay),
    );
    const centerTimer = window.setTimeout(
      resizeAndCenter,
      selectedPoint ? 140 : MAP_TRANSITION_MS + 80,
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(centerTimer);
    };
  }, [selectedPoint]);

  const drawerOpen = Boolean(selectedPoint);
  const minimumMapHeight = Math.min(Math.max(height, 320), 360);
  const mapHeightCss = `clamp(${minimumMapHeight}px, calc(100dvh - 300px), 620px)`;

  return (
    <section
      className="relative mb-1 h-[var(--crms-map-height)] min-h-0 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]"
      style={{ "--crms-map-height": mapHeightCss } as any}
    >
      <style>{`
        .maplibregl-canvas-container,
        .maplibregl-canvas {
          outline: none;
        }

        .maplibregl-map,
        .maplibregl-canvas-container,
        .maplibregl-canvas {
          width: 100% !important;
          height: 100% !important;
        }

        .maplibregl-control-container .maplibregl-ctrl-bottom-right {
          bottom: 14px;
          right: 14px;
        }

        .maplibregl-ctrl-group {
          overflow: hidden !important;
          border: 1px solid rgba(148, 163, 184, 0.35) !important;
          border-radius: 16px !important;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16) !important;
        }

        .maplibregl-ctrl-group button {
          width: 38px !important;
          height: 38px !important;
          background-color: rgba(255, 255, 255, 0.96) !important;
        }

        .maplibregl-ctrl-attrib {
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.84) !important;
          padding: 3px 9px !important;
          color: #64748b !important;
          font-size: 10px !important;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.10) !important;
          backdrop-filter: blur(12px);
        }

        .crms-maplibre-marker {
          position: relative;
          width: 36px;
          height: 46px;
          cursor: pointer;
          border: 0;
          background: transparent;
          padding: 0;
          transform: translateZ(0);
        }

        .crms-maplibre-marker:hover,
        .crms-maplibre-marker--selected {
          transform: translateY(-3px) scale(1.08) translateZ(0);
        }

        .crms-maplibre-marker__pin {
          position: absolute;
          left: 50%;
          top: 0;
          display: grid;
          width: 31px;
          height: 31px;
          place-items: center;
          border: 3px solid white;
          border-radius: 999px 999px 999px 7px;
          background: var(--marker-color);
          box-shadow:
            0 16px 30px rgba(15, 23, 42, 0.28),
            0 0 0 6px var(--marker-soft);
          transform: translateX(-50%) rotate(-45deg);
          transition: box-shadow 180ms ease, transform 180ms ease;
        }

        .crms-maplibre-marker--selected .crms-maplibre-marker__pin {
          box-shadow:
            0 20px 40px rgba(15, 23, 42, 0.32),
            0 0 0 8px var(--marker-ring),
            0 0 0 14px rgba(255, 255, 255, 0.78);
        }

        .crms-maplibre-marker__inner {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: white;
          box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.08);
        }

        .crms-maplibre-marker__shadow {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 24px;
          height: 7px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.22);
          filter: blur(4px);
          transform: translateX(-50%);
        }
      `}</style>

      <div
        className={`flex h-full min-h-0 w-full flex-col overflow-hidden p-2 transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex-row ${
          drawerOpen ? "gap-3 lg:items-stretch" : "gap-0"
        }`}
      >
        <div
          className={`relative h-full min-h-0 min-w-0 overflow-hidden rounded-[1.35rem] bg-slate-100 transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            drawerOpen ? "lg:w-[calc(70%-0.375rem)]" : "lg:w-full"
          }`}
        >
          <div
            className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-[1.15rem] border border-white/75 bg-white/[0.92] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl"
            style={{
              fontFamily:
                'Inter, "Geist Sans", "SF Pro Display", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
            }}
          >
            <p className="text-[0.53125rem] font-medium uppercase leading-none tracking-[0.14em] text-slate-500">
              San Policarpo Map View
            </p>
            <p className="mt-1.5 text-[0.8125rem] font-semibold leading-snug tracking-[-0.015em] text-slate-950">
              Vulnerable Citizen Locations
            </p>
            <p className="mt-0.5 text-[0.65625rem] font-medium leading-snug text-slate-500">
              Showing {stats.total} recorded location
              {stats.total === 1 ? "" : "s"}
            </p>
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-10 hidden rounded-2xl border border-white/75 bg-white/[0.92] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.13)] backdrop-blur-xl md:block">
            <p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Marker Legend
            </p>

            <div className="space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100" />
                <span>Needs assistance</span>
                <span className="ml-auto text-slate-400">
                  {stats.needsAssistance}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-600 ring-4 ring-amber-100" />
                <span>No relief yet</span>
                <span className="ml-auto text-slate-400">
                  {stats.noReliefYet}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                <span>Relief received</span>
                <span className="ml-auto text-slate-400">
                  {stats.reliefReceived}
                </span>
              </div>
            </div>
          </div>

          {validPoints.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-white/30 backdrop-blur-[1px]">
              <div className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
                <p className="text-sm font-semibold text-slate-950">
                  No recorded map locations
                </p>
                <p className="mt-1 max-w-sm text-xs font-medium text-slate-500">
                  The map only displays valid locations inside San Policarpo,
                  Eastern Samar.
                </p>
              </div>
            </div>
          )}

          <div ref={containerRef} className="h-full w-full overflow-hidden" />
        </div>

        <ProfileDrawer
          point={selectedPoint}
          onClose={() => setSelectedPoint(null)}
          onViewProfile={onViewProfile}
        />
      </div>
    </section>
  );
}

export default VulnerableMap;
