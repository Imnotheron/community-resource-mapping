"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, MapPin, Phone, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SAN_POLICARPO_MIN_VIEW_ZOOM,
  SAN_POLICARPO_VIEW_BOUNDS,
} from "@/lib/san-policarpo-geography";

const SAN_POLICARPO_CENTER: [number, number] = [12.1792, 125.5072];
const SAN_POLICARPO_BOUNDS: L.LatLngBoundsExpression =
  SAN_POLICARPO_VIEW_BOUNDS;

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
  registrationDate?: string | null;
  age?: number | string | null;
  gender?: string | null;
  civilStatus?: string | null;
  lastDistributionDate?: string | null;
  lastDistributionType?: string | null;
  lastItemsReceived?: string | null;
  lastReliefStatus?: string | null;
  missingNeeds?: string[] | string | null;
  assistanceType?: string | null;
  reliefAgeDays?: number | null;
  reliefResetAfterDays?: number | null;
  markerStatus?: "NEEDS_ASSISTANCE" | "NO_RELIEF" | "GIVEN" | null;
  locationPrecision?: "VERIFIED" | "BARANGAY_REFERENCE";
  locationLabel?: string | null;
}

interface VulnerableMapProps {
  points: VulnerablePoint[];
  height?: number;
  onViewProfile?: (profileId: string, point: VulnerablePoint) => void;
  interactiveMarkers?: boolean;
  resetVersion?: number;
}

function isWithinSanPolicarpo(latitude: number, longitude: number) {
  return latitude >= 12.125 && latitude <= 12.285 && longitude >= 125.375 && longitude <= 125.625;
}

function getStatus(point: VulnerablePoint) {
  const status =
    point.markerStatus ||
    (point.hasReceivedRelief
      ? "GIVEN"
      : "NEEDS_ASSISTANCE");

  if (status === "GIVEN") {
    return {
      label: "Relief received",
      color: "#16a34a",
      soft: "#dcfce7",
    };
  }

  return {
    label: "Pending distribution",
    color: "#dc2626",
    soft: "#fee2e2",
  };
}

function getAge(point: VulnerablePoint) {
  if (point.age) return String(point.age);
  if (!point.dateOfBirth) return "Not recorded";
  const birth = new Date(point.dateOfBirth);
  if (Number.isNaN(birth.getTime())) return "Not recorded";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
  return String(age);
}

function createIcon(point: VulnerablePoint, selected: boolean) {
  const status = getStatus(point);
  return L.divIcon({
    className: "crms-leaflet-marker-wrap",
    html: `<button type="button" class="crms-maplibre-marker${selected ? " crms-maplibre-marker--selected" : ""}" aria-label="${point.name}: ${status.label}" style="--marker-color:${status.color};--marker-soft:${status.soft}"><span class="crms-maplibre-marker__pin"><span class="crms-maplibre-marker__inner"></span></span><span class="crms-maplibre-marker__shadow"></span></button>`,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
  });
}

function ProfileDrawer({ point, onClose, onViewProfile }: {
  point: VulnerablePoint | null;
  onClose: () => void;
  onViewProfile?: (profileId: string, point: VulnerablePoint) => void;
}) {
  if (!point) return null;
  const status = getStatus(point);
  const photo = point.profilePhoto || point.profilePicture || point.image || point.avatarUrl || null;

  return (
    <aside className="h-full min-h-0 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] lg:w-[30%] lg:min-w-[340px]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative border-b border-slate-100 bg-slate-50 p-5">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500" aria-label="Close profile panel">
            <X className="h-4 w-4" />
          </button>
          <span className="inline-flex rounded-full px-3 py-1 text-[0.6875rem] font-semibold uppercase" style={{ backgroundColor: status.soft, color: status.color }}>{status.label}</span>
          <div className="mt-5 flex items-center gap-4 pr-12">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-slate-900 font-semibold text-white">
              {photo ? <img src={photo} alt={point.name} className="h-full w-full object-cover" /> : point.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-slate-500">Registered Citizen</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">{point.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{point.barangay || "Barangay not recorded"}</p>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4"><Phone className="h-4 w-4 text-emerald-600" /><p className="mt-2 text-xs text-slate-500">Mobile Number</p><p className="font-semibold">{point.mobileNumber || point.phone || "Not recorded"}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4"><UserRound className="h-4 w-4 text-emerald-600" /><p className="mt-2 text-xs text-slate-500">Age</p><p className="font-semibold">{getAge(point)}</p></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">Location Details</p>
              {point.locationPrecision === "BARANGAY_REFERENCE" ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-amber-800">
                  Approximate
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-emerald-800">
                  Verified
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">{point.address || "No address recorded"}</p>
            <p className="mt-2 text-xs text-slate-500">
              {point.locationLabel || (point.locationPrecision === "BARANGAY_REFERENCE" ? "Approximate barangay-level location" : "Registered map location")}
            </p>
            {point.locationPrecision !== "BARANGAY_REFERENCE" ? (
              <p className="mt-1 text-xs text-slate-500">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="font-semibold">Relief cycle status</p>
            <p className="mt-2 text-sm text-slate-600">
              {point.lastDistributionDate
                ? `Relief recorded in this cycle: ${new Date(point.lastDistributionDate).toLocaleDateString("en-PH")}`
                : "No approved relief has been recorded for this citizen in the selected cycle yet."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Red means pending distribution. Green means an approved relief distribution exists in the selected cycle.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4"><p className="font-semibold">Vulnerabilities</p><div className="mt-2 flex flex-wrap gap-2">{(point.vulnerabilityTypes?.length ? point.vulnerabilityTypes : ["Not specified"]).map((v) => <span key={v} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{String(v).replace(/_/g, " ")}</span>)}</div></div>
        </div>
        {onViewProfile || point.profileUrl ? (
          <div className="border-t border-slate-100 p-5">
            {onViewProfile ? <Button type="button" onClick={() => onViewProfile(point.id, point)} className="w-full gap-2"><ExternalLink className="h-4 w-4" />View full profile</Button> : <a href={point.profileUrl || "#"} className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><ExternalLink className="h-4 w-4" />View full profile</a>}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function VulnerableMap({ points, height = 500, onViewProfile, interactiveMarkers = true, resetVersion = 0 }: VulnerableMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [selectedPoint, setSelectedPoint] = useState<VulnerablePoint | null>(null);

  const validPoints = useMemo(() => points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && isWithinSanPolicarpo(point.latitude, point.longitude)), [points]);
  const stats = useMemo(() => ({
    total: validPoints.length,
    pending: validPoints.filter(
      (point) => getStatus(point).label === "Pending distribution",
    ).length,
    received: validPoints.filter(
      (point) => getStatus(point).label === "Relief received",
    ).length,
  }), [validPoints]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: SAN_POLICARPO_CENTER,
      zoom: SAN_POLICARPO_MIN_VIEW_ZOOM,
      minZoom: SAN_POLICARPO_MIN_VIEW_ZOOM,
      maxZoom: 18,
      maxBounds: SAN_POLICARPO_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize(false));
    ro.observe(containerRef.current);
    window.setTimeout(() => map.invalidateSize(false), 120);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(
      (marker) => marker.remove(),
    );
    markersRef.current.clear();

    validPoints.forEach((point) => {
      const marker = L.marker(
        [point.latitude, point.longitude],
        {
          icon: createIcon(point, false),
          interactive: interactiveMarkers,
          keyboard: interactiveMarkers,
        },
      ).addTo(map);

      if (interactiveMarkers) {
        marker.on("click", () =>
          setSelectedPoint(point),
        );
      }

      markersRef.current.set(point.id, marker);
    });

    map.fitBounds(SAN_POLICARPO_BOUNDS, {
      padding: [18, 18],
      animate: false,
    });

    window.requestAnimationFrame(() =>
      map.invalidateSize(false),
    );
  }, [interactiveMarkers, validPoints]);

  useEffect(() => {
    validPoints.forEach((point) => {
      markersRef.current
        .get(point.id)
        ?.setIcon(
          createIcon(
            point,
            selectedPoint?.id === point.id,
          ),
        );
    });
  }, [selectedPoint?.id, validPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = window.setTimeout(() => {
      map.invalidateSize(false);
      if (selectedPoint) map.setView([selectedPoint.latitude, selectedPoint.longitude], Math.max(map.getZoom(), 13), { animate: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || resetVersion === 0) return;

    setSelectedPoint(null);
    map.fitBounds(SAN_POLICARPO_BOUNDS, {
      padding: [18, 18],
      animate: false,
    });
    map.invalidateSize(false);
  }, [resetVersion]);

  const minimumMapHeight = Math.min(Math.max(height, 320), 360);
  const mapHeightCss = `clamp(${minimumMapHeight}px, calc(100dvh - 300px), 620px)`;

  return (
    <section className="relative mb-1 h-[var(--crms-map-height)] overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]" style={{ "--crms-map-height": mapHeightCss } as React.CSSProperties}>
      <style>{`
        .leaflet-container{width:100%;height:100%;background:#e2e8f0;font-family:inherit}.leaflet-control-zoom{overflow:hidden;border:1px solid rgba(148,163,184,.35)!important;border-radius:14px!important;box-shadow:0 14px 36px rgba(15,23,42,.14)!important}.leaflet-control-zoom a{width:36px!important;height:36px!important;line-height:36px!important;color:#334155!important}.leaflet-control-attribution{background:rgba(255,255,255,.86)!important;font-size:10px!important}.crms-leaflet-marker-wrap{background:transparent!important;border:0!important}.crms-maplibre-marker{position:relative;width:36px;height:46px;cursor:pointer;border:0;background:transparent;padding:0}.crms-maplibre-marker--selected{transform:translateY(-3px) scale(1.08)}.crms-maplibre-marker__pin{position:absolute;left:50%;top:0;display:grid;width:31px;height:31px;place-items:center;border:3px solid white;border-radius:999px 999px 999px 7px;background:var(--marker-color);box-shadow:0 16px 30px rgba(15,23,42,.28),0 0 0 6px var(--marker-soft);transform:translateX(-50%) rotate(-45deg)}.crms-maplibre-marker__inner{width:10px;height:10px;border-radius:999px;background:white}.crms-maplibre-marker__shadow{position:absolute;left:50%;bottom:0;width:24px;height:7px;border-radius:999px;background:rgba(15,23,42,.22);filter:blur(4px);transform:translateX(-50%)}
      `}</style>
      <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden p-2 lg:flex-row ${selectedPoint ? "gap-3" : "gap-0"}`}>
        <div className={`relative h-full min-h-0 min-w-0 overflow-hidden rounded-[1.35rem] bg-slate-100 ${selectedPoint ? "lg:w-[calc(70%-0.375rem)]" : "lg:w-full"}`}>
          <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-[1.15rem] border border-white/75 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-xl"><p className="text-[0.53125rem] font-medium uppercase tracking-[0.14em] text-slate-500">San Policarpo Map View</p><p className="mt-1.5 text-[0.8125rem] font-semibold text-slate-950">Vulnerable Citizen Locations</p><p className="mt-0.5 text-[0.65625rem] text-slate-500">Showing {stats.total} vulnerable profile{stats.total === 1 ? "" : "s"}</p></div>
          <div className="pointer-events-none absolute right-4 top-4 z-[500] hidden rounded-2xl border border-white/75 bg-white/90 p-3 shadow-lg md:block"><p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Marker Legend</p><div className="space-y-2 text-xs font-semibold text-slate-700"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" /><span>Pending distribution</span><span className="ml-auto text-slate-400">{stats.pending}</span></div><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: "#16a34a" }} /><span>Relief received</span><span className="ml-auto text-slate-400">{stats.received}</span></div></div></div>
          {validPoints.length === 0 ? <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center bg-white/30"><div className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-xl"><p className="text-sm font-semibold text-slate-950">No mappable vulnerable profiles</p><p className="mt-1 max-w-sm text-xs text-slate-500">CRMS shows verified locations when available and otherwise uses the registered barangay reference point.</p></div></div> : null}
          <div ref={containerRef} className="h-full w-full overflow-hidden" />
        </div>
        <ProfileDrawer point={selectedPoint} onClose={() => setSelectedPoint(null)} onViewProfile={onViewProfile} />
      </div>
    </section>
  );
}

export default VulnerableMap;
