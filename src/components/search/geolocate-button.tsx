"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { buildSearchQuery } from "@/lib/search-params";

/**
 * "Autour de moi" : le geste le plus naturel sur telephone, ou l'utilisateur
 * cherche presque toujours une agence a proximite immediate.
 * La recherche par rayon existe deja cote base (PostGIS), il suffit de lui
 * passer les coordonnees.
 */
export function GeolocateButton({
  radiusKm = 25,
  className,
  variant = "outline",
  size = "md",
  label = "Autour de moi",
}: {
  radiusKm?: number;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Votre navigateur ne partage pas votre position.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        const query = buildSearchQuery({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
          radiusKm,
          sort: "distance",
          page: 1,
        });
        router.push(`/recherche?${query}`);
      },
      (error) => {
        setLoading(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? "Position refusee. Choisissez une ville dans la liste."
            : "Impossible de vous localiser pour le moment.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={locate}
      disabled={loading}
    >
      {loading ? <Loader2 className="animate-spin" /> : <LocateFixed />}
      {label}
    </Button>
  );
}
