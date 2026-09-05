"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";

import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { MapCanvasProps, MapPoint } from "@/components/map/types";

export type { MapPoint } from "@/components/map/types";

const SOURCE_ID = "rm-points";
const FONT_STACK = ["Noto Sans Bold", "Open Sans Bold", "Arial Unicode MS Bold"];

const INK = "#1e2637";
const AMBER = "#c98213";

function toFeatureCollection(points: MapPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points
      .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map((p) => ({
        type: "Feature",
        id: p.id,
        properties: { id: p.id, label: p.label, featured: p.featured ? 1 : 0 },
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      })),
  };
}

export function MapCanvas({
  points,
  center = [2.4, 46.6],
  zoom = 5,
  activeId = null,
  onSelect,
  fitToPoints = false,
  interactive = true,
  className,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const onSelectRef = useRef(onSelect);

  // La ref garde le dernier callback sans re-creer la carte a chaque rendu.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // --- Initialisation (une seule fois) --------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: publicEnv.mapStyleUrl,
      center,
      zoom,
      interactive,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(
        new maplibregl.GeolocateControl({ trackUserLocation: false, showAccuracyCircle: true }),
        "top-right",
      );
    }

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection([]),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": INK,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 17, 10, 21, 50, 26],
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": FONT_STACK,
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "point-pill",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case", ["==", ["get", "featured"], 1], AMBER, INK],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-radius": ["step", ["length", ["get", "label"]], 15, 5, 18, 7, 21],
        },
      });

      map.addLayer({
        id: "point-label",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "label"],
          "text-font": FONT_STACK,
          "text-size": 11,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });

      readyRef.current = true;
      const initialSource = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      initialSource?.setData(toFeatureCollection(points));

      map.on("click", "clusters", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const clusterId = feature.properties?.cluster_id as number;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((expansionZoom) => {
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: [lng, lat], zoom: expansionZoom, duration: 450 });
        });
      });

      map.on("click", "point-pill", (event) => {
        const id = event.features?.[0]?.properties?.id as string | undefined;
        if (id) onSelectRef.current?.(id);
      });

      for (const layer of ["clusters", "point-pill", "point-label"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Mise a jour des points -----------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(points));

    if (fitToPoints && points.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 13, duration: 500 });
    }
  }, [points, fitToPoints]);

  // --- Recentrage explicite -------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitToPoints) return;
    map.easeTo({ center, zoom, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);

  // --- Mise en avant de l'element survole dans la liste -----------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !activeId) return;
    const target = points.find((p) => p.id === activeId);
    if (!target) return;
    map.easeTo({ center: [target.longitude, target.latitude], duration: 400 });
  }, [activeId, points]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full overflow-hidden bg-surface-muted", className)}
      aria-label="Carte des loueurs"
      role="application"
    />
  );
}
