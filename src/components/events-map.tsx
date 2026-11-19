"use client";

import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

export type MapEventPin = {
  id: string;
  slug: string;
  title: string;
  venueName: string;
  when?: string;
  latitude: number | null;
  longitude: number | null;
};

const BELEM_CENTER: [number, number] = [-1.4558, -48.4902];

function isValidPin(
  event: MapEventPin,
): event is MapEventPin & { latitude: number; longitude: number } {
  return (
    typeof event.latitude === "number" &&
    typeof event.longitude === "number" &&
    Number.isFinite(event.latitude) &&
    Number.isFinite(event.longitude) &&
    Math.abs(event.latitude) <= 90 &&
    Math.abs(event.longitude) <= 180 &&
    !(event.latitude === 0 && event.longitude === 0)
  );
}

function buildPopupElement(event: MapEventPin, singlePin: boolean) {
  const wrap = document.createElement("div");
  wrap.className = "events-map-popup";

  if (singlePin) {
    const title = document.createElement("strong");
    title.textContent = event.title;
    wrap.appendChild(title);
  } else {
    const link = document.createElement("a");
    link.href = `/eventos/${event.slug}`;
    link.textContent = event.title;
    wrap.appendChild(link);
  }

  const venue = document.createElement("span");
  venue.textContent = event.venueName;
  wrap.appendChild(venue);

  if (event.when) {
    const when = document.createElement("small");
    when.textContent = event.when;
    wrap.appendChild(when);
  }
  return wrap;
}

export function EventsMap({
  events,
  compact = false,
  singlePin = false,
}: {
  events: MapEventPin[];
  compact?: boolean;
  singlePin?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pins = useMemo(() => events.filter(isValidPin), [events]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || pins.length === 0) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
      }).setView(BELEM_CENTER, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "events-map-pin",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10],
      });

      const bounds = L.latLngBounds([]);
      for (const pin of pins) {
        const coords: [number, number] = [pin.latitude, pin.longitude];
        bounds.extend(coords);
        L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(buildPopupElement(pin, singlePin));
      }

      if (pins.length === 1) {
        map.setView([pins[0].latitude, pins[0].longitude], 15);
      } else {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins, singlePin]);

  if (pins.length === 0) {
    if (singlePin) return null;
    return (
      <div className="events-map-empty">
        <MapPin />
        <span>
          Nenhum dos eventos desta lista tem coordenadas cadastradas no mapa
          ainda.
        </span>
      </div>
    );
  }

  return (
    <div className={`events-map-wrap${compact ? " events-map-compact" : ""}`}>
      <div
        ref={containerRef}
        className="events-map"
        aria-label={`Mapa com ${pins.length} ${pins.length === 1 ? "local" : "locais"} em Belém`}
      />
      {!singlePin && (
        <small className="events-map-caption">
          <MapPin /> {pins.length}{" "}
          {pins.length === 1
            ? "evento com localização no mapa"
            : "eventos com localização no mapa"}
        </small>
      )}
    </div>
  );
}
