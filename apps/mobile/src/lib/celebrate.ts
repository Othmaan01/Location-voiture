import { create } from "zustand";

/**
 * Moment de reussite (D9, retour fondateur) : une animation courte quand une etape est validee,
 * client ou loueur. Un seul etat global, affiche par <Celebration /> a la racine.
 */
export interface CelebrationContent {
  title: string;
  subtitle?: string;
}
interface CelebrationState {
  current: (CelebrationContent & { key: number }) | null;
  show: (content: CelebrationContent) => void;
  hide: () => void;
}
export const useCelebration = create<CelebrationState>((set) => ({
  current: null,
  show: (content) => set({ current: { ...content, key: Date.now() } }),
  hide: () => set({ current: null }),
}));

/** A appeler dans un onSuccess : `celebrate("Réservation confirmée", "Le client est prévenu.")`. */
export function celebrate(title: string, subtitle?: string): void {
  useCelebration.getState().show(subtitle ? { title, subtitle } : { title });
}
