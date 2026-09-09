import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Briefcase,
  Car,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Star,
  Tag,
  Users,
  X,
} from "lucide-react-native";
import type { PublicVehicleDetail } from "@lv/contracts";

import {
  Avatar,
  Badge,
  Button,
  CalendarLegend,
  Card,
  EmptyState,
  MonthCalendar,
  Screen,
  Text,
  dayKey,
  markRange,
  type DayState,
} from "@/components/ui";
import { ACCENT_COLOR } from "@/features/client/accent";
import { CATEGORY_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatEuros } from "@/features/pro/labels";
import { formatPeriod, useSearchState } from "@/features/client/search-state";
import { ContactSheet } from "@/features/messaging/ContactSheet";
import { formatOffer } from "@/lib/queries-offers";
import {
  useFavorites,
  useToggleFavorite,
  useVehicle,
  useVehicleAvailability,
} from "@/lib/queries-public";
import { startOfDay, withSlot } from "@/features/client/slots";
import { useMemo } from "react";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

const GALLERY_RATIO = 4 / 3;

/**
 * Fiche vehicule (retour fondateur, 2026-09-09) : galerie plein ecran, caracteristiques,
 * tarif, agence, loueur, et un seul bouton d'action fixe en bas. Meme DA nuit que le reste.
 */
export default function VehicleScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const { from, to, setPeriod } = useSearchState();
  const period = from && to ? { from, to } : null;
  const vehicle = useVehicle(vehicleId, period);
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const [index, setIndex] = useState(0);
  const [contact, setContact] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const listRef = useRef<FlatList<string>>(null);
  // Disponibilites sur trois mois : la meme source que le calendrier de reservation.
  const today = useMemo(() => startOfDay(new Date()), []);
  const horizon = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 3);
    return d;
  }, [today]);
  const availability = useVehicleAvailability(
    vehicleId,
    today.toISOString(),
    horizon.toISOString(),
  );
  const dayStates = useMemo(() => {
    const m = new Map<string, DayState>();
    for (const u of availability.data?.unavailable ?? []) markRange(m, u.from, u.to, "unavailable");
    return m;
  }, [availability.data]);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [pickStart, setPickStart] = useState<Date | null>(from ? startOfDay(new Date(from)) : null);
  const [pickEnd, setPickEnd] = useState<Date | null>(to ? startOfDay(new Date(to)) : null);
  const pickDay = (day: Date) => {
    const crosses = (a: Date, b: Date) => {
      for (let d = new Date(a); d.getTime() <= b.getTime(); d.setDate(d.getDate() + 1))
        if (dayStates.has(dayKey(d))) return true;
      return false;
    };
    if (pickStart && !pickEnd && day.getTime() > pickStart.getTime() && !crosses(pickStart, day)) {
      setPickEnd(day);
      setPeriod(
        withSlot(pickStart, { hour: 9, minute: 0 }).toISOString(),
        withSlot(day, { hour: 9, minute: 0 }).toISOString(),
      );
      return;
    }
    setPickStart(day);
    setPickEnd(null);
  };

  if (vehicle.isPending) {
    return (
      <Screen back scroll={false}>
        <ActivityIndicator color={theme.colors.accent} />
      </Screen>
    );
  }
  if (vehicle.isError || !vehicle.data) {
    return (
      <Screen back scroll={false}>
        <EmptyState
          title="Véhicule indisponible"
          description="Il n'est plus proposé sur l'application."
        />
      </Screen>
    );
  }
  const v = vehicle.data;
  const accent = ACCENT_COLOR[v.loueur.accent];
  const favorite = !!favorites.data?.vehicles.some((f) => f.id === v.id);
  const photos = v.photos.length > 0 ? v.photos : [];
  const galleryW = width - 2 * theme.space["4"];
  const galleryH = Math.round(galleryW / GALLERY_RATIO);
  // Estimation sur les dates choisies : nombre de jours x prix du jour (le devis exact vient a l'etape suivante).
  const days =
    from && to
      ? Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000))
      : null;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / galleryW));
  const price = v.discountedDailyCents ?? v.dailyCents;
  const estimate = price !== null && days !== null ? price * days : null;

  const specs: { icon: typeof Car; label: string }[] = [
    { icon: Settings2, label: TRANSMISSION_LABEL[v.transmission] ?? v.transmission },
    { icon: Fuel, label: FUEL_LABEL[v.fuel] ?? v.fuel },
    { icon: Users, label: `${v.seats} places` },
    ...(v.doors ? [{ icon: DoorOpen, label: `${v.doors} portes` }] : []),
    ...(v.luggage ? [{ icon: Briefcase, label: `${v.luggage} bagages` }] : []),
    ...(v.year ? [{ icon: Gauge, label: String(v.year) }] : []),
  ];

  return (
    <View style={styles.root}>
      <Screen scroll contentStyle={styles.content}>
        <View style={styles.galleryWrap}>
          <View style={[styles.gallery, { height: galleryH }]}>
            {photos.length > 0 ? (
              <FlatList
                ref={listRef}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={32}
                keyExtractor={(uri, i) => `${i}-${uri}`}
                renderItem={({ item, index: i }) => (
                  <Pressable
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`Photo ${i + 1} sur ${photos.length}, agrandir`}
                    onPress={() => setViewer(i)}
                  >
                    <Image
                      source={{ uri: item }}
                      style={{ width: galleryW, height: galleryH }}
                      contentFit="contain"
                      transition={200}
                    />
                  </Pressable>
                )}
              />
            ) : (
              <View style={[styles.empty, { height: galleryH }]}>
                <Car size={48} color={theme.colors.textDim} />
              </View>
            )}
            <View style={styles.galleryTop} pointerEvents="box-none">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour"
                onPress={() => router.back()}
                style={styles.roundBtn}
              >
                <ChevronLeft size={22} color="#ffffff" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                onPress={() =>
                  session
                    ? toggle.mutate({ vehicleId: v.id, on: !favorite })
                    : router.push("/(auth)/sign-in")
                }
                style={styles.roundBtn}
              >
                <Heart
                  size={22}
                  color={favorite ? theme.colors.accent : "#ffffff"}
                  fill={favorite ? theme.colors.accent : "transparent"}
                />
              </Pressable>
            </View>
            {photos.length > 1 ? (
              <View style={styles.counter} pointerEvents="none">
                <Text style={styles.counterText}>
                  {index + 1} / {photos.length}
                </Text>
              </View>
            ) : null}
          </View>
          {photos.length > 1 ? (
            <FlatList
              data={photos}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, i) => `t${i}-${uri}`}
              contentContainerStyle={styles.thumbs}
              renderItem={({ item, index: i }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Voir la photo ${i + 1}`}
                  onPress={() => {
                    setIndex(i);
                    listRef.current?.scrollToOffset({ offset: i * galleryW, animated: true });
                  }}
                  style={[styles.thumb, i === index ? styles.thumbOn : null]}
                >
                  <Image source={{ uri: item }} style={styles.thumbImage} contentFit="cover" />
                </Pressable>
              )}
            />
          ) : null}
        </View>

        <View style={styles.head}>
          <View style={styles.titleRow}>
            <View style={styles.titles}>
              <Text variant="h1">
                {v.brand} {v.model}
              </Text>
              {v.version ? (
                <Text variant="sm" tone="muted">
                  {v.version}
                </Text>
              ) : null}
            </View>
            {v.offer ? (
              <Badge
                label={formatOffer(v.offer)}
                tone="success"
                icon={<Tag size={12} color={theme.colors.success} strokeWidth={2.5} />}
              />
            ) : null}
          </View>
          <View style={styles.priceRow}>
            {price !== null ? (
              <View style={styles.priceInline}>
                <Text variant="h1">{formatEuros(price)}</Text>
                <Text variant="sm" tone="muted">
                  / jour
                </Text>
                {v.discountedDailyCents !== null && v.dailyCents !== null ? (
                  <Text variant="sm" tone="dim" style={styles.struck}>
                    {formatEuros(v.dailyCents)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text variant="sm" tone="muted">
                Tarif sur demande
              </Text>
            )}
            <Badge label={CATEGORY_LABEL[v.category] ?? v.category} tone="neutral" />
          </View>
          {v.available === false ? (
            <Badge label="Indisponible sur vos dates" tone="warning" />
          ) : v.available === true ? (
            <Badge label={`Disponible · ${formatPeriod(from!, to!)}`} tone="success" />
          ) : null}
        </View>

        <View style={styles.specs}>
          {specs.map((s) => (
            <View key={s.label} style={styles.spec}>
              <s.icon size={18} color={theme.colors.textMuted} />
              <Text variant="smStrong">{s.label}</Text>
            </View>
          ))}
        </View>

        {v.description ? (
          <Section title="À propos de ce véhicule">
            <Text variant="body" tone="muted">
              {v.description}
            </Text>
          </Section>
        ) : null}
        {v.options.length > 0 ? (
          <Section title="Équipements">
            <View style={styles.chips}>
              {v.options.map((o) => (
                <View key={o} style={styles.chip}>
                  <Text variant="sm">{o}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Disponibilités">
          <Card>
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              minDay={today}
              startDay={pickStart}
              endDay={pickEnd}
              onPickDay={pickDay}
              dayStates={dayStates}
              compact
            />
            <CalendarLegend states={dayStates.size > 0 ? ["unavailable"] : []} />
            <Text variant="small" tone="dim">
              {pickStart && pickEnd
                ? `Vos dates : ${formatPeriod(withSlot(pickStart, { hour: 9, minute: 0 }).toISOString(), withSlot(pickEnd, { hour: 9, minute: 0 }).toISOString())}. Les heures se précisent à l'étape suivante.`
                : pickStart
                  ? "Touchez maintenant le jour de retour."
                  : "Touchez le jour de retrait, puis le jour de retour. Les jours barrés sont déjà pris."}
            </Text>
          </Card>
        </Section>

        <Section title="Tarif">
          <Card padded={false}>
            <Row label="Par jour" value={v.dailyCents !== null ? formatEuros(v.dailyCents) : "—"} />
            {v.ratePlan?.weekendDailyCents ? (
              <Row label="Jour de week-end" value={formatEuros(v.ratePlan.weekendDailyCents)} />
            ) : null}
            {v.ratePlan?.weeklyCents ? (
              <Row label="La semaine" value={formatEuros(v.ratePlan.weeklyCents)} />
            ) : null}
            {v.ratePlan?.monthlyCents ? (
              <Row label="Le mois" value={formatEuros(v.ratePlan.monthlyCents)} />
            ) : null}
            {v.ratePlan?.kmIncludedPerDay ? (
              <Row
                label="Kilomètres inclus"
                value={`${v.ratePlan.kmIncludedPerDay} km / jour${v.ratePlan.extraKmCents ? ` · ${formatEuros(v.ratePlan.extraKmCents)} le km en plus` : ""}`}
              />
            ) : null}
            <Row
              label="Caution"
              value={v.depositCents !== null ? formatEuros(v.depositCents) : "—"}
              last={!v.minDriverAge && !v.minLicenseYears}
            />
            {v.minDriverAge || v.minLicenseYears ? (
              <Row
                label="Conditions"
                value={[
                  v.minDriverAge ? `${v.minDriverAge} ans minimum` : null,
                  v.minLicenseYears
                    ? `${v.minLicenseYears} an${v.minLicenseYears > 1 ? "s" : ""} de permis`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                last
              />
            ) : null}
          </Card>
          <Text variant="small" tone="dim">
            Paiement à l'agence, au prix affiché. Aucune commission.
          </Text>
        </Section>

        <Section title="Retrait">
          <Card>
            <View style={styles.agencyRow}>
              <MapPin size={20} color={theme.colors.accentTint} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{v.agency.name}</Text>
                <Text variant="sm" tone="muted">
                  {[
                    v.agency.addressLine,
                    [v.agency.postalCode, v.agency.cityName].filter(Boolean).join(" "),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
              {v.agency.latitude !== null && v.agency.longitude !== null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Itinéraire"
                  onPress={() =>
                    void Linking.openURL(
                      `https://maps.apple.com/?daddr=${v.agency.latitude},${v.agency.longitude}`,
                    )
                  }
                  hitSlop={8}
                >
                  <ChevronRight size={20} color={theme.colors.textDim} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        </Section>

        <Section title="Loueur">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/loueurs/${v.loueur.id}`)}
            style={({ pressed }) => [styles.loueur, pressed ? styles.pressed : null]}
          >
            <View style={[styles.loueurRing, { borderColor: accent }]}>
              <Avatar name={v.loueur.name} uri={v.loueur.logoUrl} size={44} />
            </View>
            <View style={styles.flex}>
              <View style={styles.loueurHead}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {v.loueur.name}
                </Text>
                {v.loueur.verified ? (
                  <ShieldCheck size={16} color={theme.colors.accentTint} strokeWidth={2.5} />
                ) : null}
              </View>
              <Text variant="small" tone="muted">
                {v.loueur.vehicleCount} véhicule{v.loueur.vehicleCount > 1 ? "s" : ""}
                {v.loueur.ratingAverage !== null
                  ? ` · ${v.loueur.ratingAverage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ★ (${v.loueur.ratingCount})`
                  : ""}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textDim} />
          </Pressable>
        </Section>
        <View style={{ height: 96 + insets.bottom }} />
      </Screen>

      <View style={[styles.bar, { paddingBottom: insets.bottom + theme.space["3"] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Écrire au loueur"
          onPress={() => (session ? setContact(true) : router.push("/(auth)/sign-in"))}
          style={styles.barGhost}
        >
          <MessageCircle size={22} color={theme.colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/vehicules/${v.id}/demande`)}
          style={({ pressed }) => [styles.cta, pressed ? styles.ctaPressed : null]}
        >
          <Text variant="bodyStrong" style={styles.ctaText}>
            {v.available === false ? "Choisir d'autres dates" : "Réserver ce véhicule"}
          </Text>
          {estimate !== null && v.available !== false ? (
            <>
              <View style={styles.ctaDivider} />
              <Text variant="bodyStrong" style={styles.ctaText}>
                {formatEuros(estimate)}
              </Text>
            </>
          ) : null}
        </Pressable>
      </View>

      <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} width={width} />

      <ContactSheet
        visible={contact}
        onClose={() => setContact(false)}
        organizationId={v.loueur.id}
        organizationName={v.loueur.name}
        vehicleId={v.id}
      />
    </View>
  );
}

/** Plein ecran : un balayage par photo, pincement pour zoomer jusqu'a x4, jamais plus petit que l'image. */
function PhotoViewer({
  photos,
  index,
  onClose,
  width,
}: {
  photos: string[];
  index: number | null;
  onClose: () => void;
  width: number;
}) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index ?? 0);
  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);
  if (index === null) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          keyExtractor={(uri, i) => `v${i}-${uri}`}
          renderItem={({ item }) => (
            <ScrollView
              style={{ width }}
              contentContainerStyle={styles.viewerPage}
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom={false}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri: item }} style={styles.viewerImage} contentFit="contain" />
            </ScrollView>
          )}
        />
        <View style={[styles.viewerTop, { top: insets.top + 8 }]} pointerEvents="box-none">
          <Text style={styles.counterText}>
            {current + 1} / {photos.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={onClose}
            style={styles.roundBtn}
          >
            <X size={22} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h2">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last ? null : styles.rowBorder]}>
      <Text variant="sm" tone="muted" style={styles.flex}>
        {label}
      </Text>
      <Text variant="smStrong" style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { gap: theme.space["5"] },
  galleryWrap: { gap: theme.space["2"] },
  gallery: {
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  thumbs: { gap: theme.space["2"] },
  thumb: {
    width: 64,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: theme.colors.surface,
  },
  thumbOn: { borderColor: theme.colors.accent },
  thumbImage: { width: "100%", height: "100%" },
  priceInline: { flexDirection: "row", alignItems: "baseline", gap: theme.space["2"] },
  cta: {
    flex: 1,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space["3"],
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.space["4"],
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: { color: "#ffffff" },
  ctaDivider: { width: 1, height: 22, backgroundColor: "rgba(255,255,255,0.45)" },
  viewer: { flex: 1, backgroundColor: "#000000" },
  viewerPage: { flexGrow: 1, justifyContent: "center" },
  viewerImage: { width: "100%", aspectRatio: 4 / 3 },
  viewerTop: {
    position: "absolute",
    left: theme.space["4"],
    right: theme.space["3"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  empty: { alignItems: "center", justifyContent: "center" },
  galleryTop: {
    position: "absolute",
    top: theme.space["3"],
    left: theme.space["3"],
    right: theme.space["3"],
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10,10,12,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  dotOn: { backgroundColor: "#ffffff", width: 16 },
  counter: {
    position: "absolute",
    right: theme.space["3"],
    bottom: theme.space["3"],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(10,10,12,0.6)",
  },
  counterText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  head: { gap: theme.space["2"] },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: theme.space["2"] },
  titles: { flex: 1, gap: 2 },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.space["2"],
    flexWrap: "wrap",
  },
  struck: { textDecorationLine: "line-through" },
  specs: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["2"] },
  spec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: theme.space["3"],
    paddingVertical: 10,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  section: { gap: theme.space["3"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space["2"] },
  chip: {
    paddingHorizontal: theme.space["3"],
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    paddingHorizontal: theme.space["4"],
    minHeight: 48,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowValue: { textAlign: "right", flexShrink: 1 },
  agencyRow: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  flex: { flex: 1 },
  loueur: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    padding: theme.space["3"],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loueurRing: { padding: 2, borderWidth: 2, borderRadius: 14 },
  loueurHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  pressed: { opacity: 0.9 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space["3"],
    paddingHorizontal: theme.space["4"],
    paddingTop: theme.space["3"],
    backgroundColor: "rgba(14,14,17,0.96)",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  barGhost: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
