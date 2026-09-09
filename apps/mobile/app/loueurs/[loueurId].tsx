import { useLocalSearchParams } from "expo-router";

import { LoueurProfile } from "@/features/client/LoueurProfile";

export default function LoueurScreen() {
  const { loueurId } = useLocalSearchParams<{ loueurId: string }>();
  return <LoueurProfile loueurId={loueurId} />;
}
