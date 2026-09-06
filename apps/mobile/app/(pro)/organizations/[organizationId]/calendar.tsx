import { useLocalSearchParams } from "expo-router";

import { OrgCalendarView } from "@/features/pro/views/OrgCalendarView";

export default function CalendarScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  return <OrgCalendarView organizationId={organizationId} />;
}
