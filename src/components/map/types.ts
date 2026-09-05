/**
 * Types partages de la cartographie.
 *
 * Fichier volontairement separe de `map-canvas.tsx` : les composants qui n'ont
 * besoin que du type ne tirent pas MapLibre (~250 ko) dans leur bundle.
 */
export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  /** Texte affiche dans la pastille (ex. "49 €" ou "12"). */
  label: string;
  featured?: boolean;
}

export interface MapCanvasProps {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** Recadre automatiquement sur l'ensemble des points a chaque changement. */
  fitToPoints?: boolean;
  interactive?: boolean;
  className?: string;
}
