import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  LayoutAnimation,
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
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Fuel,
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
import type { Review } from "@lv/contracts";
import { QuoteError, quote as computeQuote } from "@lv/pricing";

import {
  Avatar,
  Badge,
  CalendarLegend,
  Card,
  EmptyState,
  MonthCalendar,
  Screen,
  Text,
  WheelPicker,
  dayKey,
  markRange,
  type DayState,
} from "@/components/ui";
import { ACCENT_COLOR } from "@/features/client/accent";
import { CATEGORY_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatEuros } from "@/features/pro/labels";
import { formatPeriod, useSearchState } from "@/features/client/search-state";
import {
  SLOTS,
  formatSlot,
  slotOf,
  startOfDay,
  withSlot,
  type Slot,
} from "@/features/client/slots";
import { ContactSheet } from "@/features/messaging/ContactSheet";
import { formatOffer } from "@/lib/queries-offers";
import { useVehicle, useVehicleAvailability } from "@/lib/queries-public";
import { useFavoriteAction } from "@/features/client/favorites";
import { useLoueurReviews } from "@/lib/queries-reviews";
import { useSession } from "@/lib/session";
import { theme } from "@/theme";

const GALLERY_RATIO = 4 / 3;
const NINE: Slot = { hour: 9, minute: 0 };
const SLOT_LABELS = SLOTS.map(formatSlot);
const slotIndex = (s: Slot) =>
  Math.max(
    0,
    SLOTS.findIndex((x) => x.hour === s.hour && x.minute === s.minute),
  );

/**
 * Fiche vehicule (retour fondateur, 2026-09-09 et 2026-09-10) : galerie, caracteristiques,
 * disponibilites avec heures en roulette, tarif repliable, agence, loueur, avis en carrousel,
 * et un seul bouton d'action fixe en bas dont le prix est celui du devis (meme calcul, ADR-0023).
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
  const fav = useFavoriteAction();
  const reviews = useLoueurReviews(vehicle.data?.loueur.id ?? "", !!vehicle.data);
  const [index, setIndex] = useState(0);
  const [contact, setContact] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [open, setOpen] = useState<"description" | "tarif" | null>(null);
  const [reviewScope, setReviewScope] = useState<"vehicle" | "agency">("vehicle");
  const [reviewIndex, setReviewIndex] = useState(0);
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
  const [startSlot, setStartSlot] = useState<Slot>(from ? slotOf(new Date(from)) : NINE);
  const [endSlot, setEndSlot] = useState<Slot>(to ? slotOf(new Date(to)) : NINE);
  const commit = (start: Date, end: Date, s1: Slot, s2: Slot) =>
    setPeriod(withSlot(start, s1).toISOString(), withSlot(end, s2).toISOString());
  const pickDay = (day: Date) => {
    const crosses = (a: Date, b: Date) => {
      for (let d = new Date(a); d.getTime() <= b.getTime(); d.setDate(d.getDate() + 1))
        if (dayStates.has(dayKey(d))) return true;
      return false;
    };
    if (pickStart && !pickEnd && day.getTime() > pickStart.getTime() && !crosses(pickStart, day)) {
      setPickEnd(day);
      commit(pickStart, day, startSlot, endSlot);
      return;
    }
    setPickStart(day);
    setPickEnd(null);
  };
  const changeSlot = (which: "start" | "end", i: number) => {
    const s = SLOTS[i] ?? NINE;
    if (which === "start") setStartSlot(s);
    else setEndSlot(s);
    if (pickStart && pickEnd)
      commit(pickStart, pickEnd, which === "start" ? s : startSlot, which === "end" ? s : endSlot);
  };

  // Estimation = le calcul du devis lui-meme (@lv/pricing), avec les dates ET les heures choisies.
  const estimate = useMemo(() => {
    const d = vehicle.data;
    if (!d || !pickStart || !pickEnd || d.dailyCents === null) return null;
    const start = withSlot(pickStart, startSlot);
    const end = withSlot(pickEnd, endSlot);
    if (end.getTime() <= start.getTime())
      return { total: null, days: null, note: "Retour avant le retrait" };
    try {
      const q = computeQuote({
        ratePlan: {
          currency: d.currency,
          dailyCents: d.dailyCents,
          weekendDailyCents: d.ratePlan?.weekendDailyCents ?? null,
          weeklyCents: d.ratePlan?.weeklyCents ?? null,
          monthlyCents: d.ratePlan?.monthlyCents ?? null,
          depositCents: d.depositCents ?? 0,
          kmIncludedPerDay: d.ratePlan?.kmIncludedPerDay ?? null,
          extraKmCents: d.ratePlan?.extraKmCents ?? null,
          minDays: d.ratePlan?.minDays ?? 1,
          maxDays: d.ratePlan?.maxDays ?? null,
        },
        period: { start: start.toISOString(), end: end.toISOString() },
        agencyTimeZone: d.agency.timezone,
        discount: d.offer
          ? {
              label: `Offre : ${d.offer.title}`,
              type: d.offer.discountType,
              value: d.offer.discountValue,
            }
          : null,
      });
      return { total: q.total.cents, days: q.days, note: null };
    } catch (e) {
      return {
        total: null,
        days: null,
        note: e instanceof QuoteError ? e.message : "Période invalide",
      };
    }
  }, [vehicle.data, pickStart, pickEnd, startSlot, endSlot]);
  // Petite animation d'actualisation du prix a chaque changement (pas de rechargement).
  const priceFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    priceFade.setValue(0.25);
    Animated.timing(priceFade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [estimate?.total, estimate?.note, priceFade]);

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
  const favorite = fav.isFavorite(v.id);
  const photos = v.photos.length > 0 ? v.photos : [];
  const galleryW = width - 2 * theme.space["4"];
  const galleryH = Math.round(galleryW / GALLERY_RATIO);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / galleryW));
  const price = v.discountedDailyCents ?? v.dailyCents;
  const allReviews = reviews.data?.reviews ?? [];
  const vehicleReviews = allReviews.filter((r) => r.vehicleId === v.id);
  const shownReviews = reviewScope === "vehicle" ? vehicleReviews : allReviews;
  const reviewW = Math.round(galleryW * 0.84);
  const reviewGap = theme.space["3"];
  const toggleTile = (kind: "description" | "tarif") => {
    setOpen((o) => (o === kind ? null : kind));
    // Animation de depliage quand la plateforme la permet ; jamais bloquante.
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {
      // sans animation
    }
  };
  // Dates changees : la fiche reste affichee, la disponibilite se verifie en arriere-plan.
  const checking = vehicle.isPlaceholderData || vehicle.isFetching;
  const tarifSummary = [
    v.dailyCents !== null ? `${formatEuros(v.dailyCents)} / jour` : "Sur demande",
    v.depositCents !== null ? `caution ${formatEuros(v.depositCents)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Trois vignettes seulement, les plus utiles (retour fondateur) ; le reste dans « Description ».
  const specs: { icon: typeof Car; label: string }[] = [
    { icon: Settings2, label: TRANSMISSION_LABEL[v.transmission] ?? v.transmission },
    { icon: Fuel, label: FUEL_LABEL[v.fuel] ?? v.fuel },
    { icon: Users, label: `${v.seats} places` },
  ];
  const details: { label: string; value: string }[] = [
    { label: "Catégorie", value: CATEGORY_LABEL[v.category] ?? v.category },
    ...(v.year ? [{ label: "Année", value: String(v.year) }] : []),
    ...(v.doors ? [{ label: "Portes", value: String(v.doors) }] : []),
    ...(v.luggage ? [{ label: "Bagages", value: String(v.luggage) }] : []),
    ...(v.color ? [{ label: "Couleur", value: v.color }] : []),
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
                // Ouverte par un lien (notification, partage) : pas d'historique, on rentre a l'accueil.
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
                style={styles.roundBtn}
              >
                <ChevronLeft size={22} color="#ffffff" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                onPress={() => fav.toggle(v.id)}
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
          </View>
        </View>

        <View style={styles.specs}>
          {specs.map((s) => (
            <View key={s.label} style={styles.spec}>
              <s.icon size={18} color={theme.colors.textMuted} />
              <Text variant="smStrong">{s.label}</Text>
            </View>
          ))}
        </View>

        <Section
          title="Vos dates"
          right={
            <View style={styles.wheels}>
              <WheelPicker
                label="Retrait"
                items={SLOT_LABELS}
                index={slotIndex(startSlot)}
                onChange={(i) => changeSlot("start", i)}
              />
              <WheelPicker
                label="Retour"
                items={SLOT_LABELS}
                index={slotIndex(endSlot)}
                onChange={(i) => changeSlot("end", i)}
              />
            </View>
          }
        >
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
            <View style={styles.statusRule} />
            <View style={styles.status}>
              {pickStart && pickEnd ? (
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: checking
                        ? theme.colors.textDim
                        : v.available === false
                          ? theme.colors.warning
                          : theme.colors.success,
                    },
                  ]}
                />
              ) : null}
              <Text
                variant="small"
                tone={
                  pickStart && pickEnd
                    ? checking
                      ? "muted"
                      : v.available === false
                        ? "warning"
                        : "success"
                    : "dim"
                }
                style={styles.flex}
              >
                {pickStart && pickEnd
                  ? `${checking ? "Vérification" : v.available === false ? "Indisponible" : "Disponible"} · ${formatPeriod(withSlot(pickStart, startSlot).toISOString(), withSlot(pickEnd, endSlot).toISOString())} · ${formatSlot(startSlot)} → ${formatSlot(endSlot)}${estimate?.days ? ` · ${estimate.days} jour${estimate.days > 1 ? "s" : ""}` : ""}${!checking && v.available === false ? ". Choisissez d'autres jours." : ""}`
                  : pickStart
                    ? "Touchez maintenant le jour de retour."
                    : "Touchez le jour de retrait, puis le jour de retour. Les jours barrés sont déjà pris."}
              </Text>
            </View>
          </Card>
        </Section>

        <View style={styles.section}>
          <View style={styles.tiles}>
            <Tile
              title="Description"
              hint={v.description ?? details.map((d) => d.value).join(" · ")}
              open={open === "description"}
              onPress={() => toggleTile("description")}
            />
            <Tile
              title="Tarif"
              hint={tarifSummary}
              open={open === "tarif"}
              onPress={() => toggleTile("tarif")}
            />
          </View>
          {open === "description" ? (
            <Card padded={false}>
              {v.description ? (
                <View style={styles.descriptionText}>
                  <Text variant="body" tone="muted">
                    {v.description}
                  </Text>
                </View>
              ) : null}
              {details.map((d, i) => (
                <Row
                  key={d.label}
                  label={d.label}
                  value={d.value}
                  last={i === details.length - 1}
                />
              ))}
            </Card>
          ) : null}
          {open === "tarif" ? (
            <>
              <Card padded={false}>
                <Row
                  label="Par jour"
                  value={v.dailyCents !== null ? formatEuros(v.dailyCents) : "—"}
                />
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
            </>
          ) : null}
        </View>

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

        <Section title="Lieu de retrait">
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

        <Section title="L'agence">
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
                  ? ` · ${v.loueur.ratingAverage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5 (${v.loueur.ratingCount})`
                  : ` · ${v.loueur.ratingCount} avis`}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textDim} />
          </Pressable>
        </Section>

        <Section
          title="Avis"
          right={
            <View style={styles.segment}>
              {(["vehicle", "agency"] as const).map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: reviewScope === s }}
                  onPress={() => {
                    setReviewScope(s);
                    setReviewIndex(0);
                  }}
                  style={[styles.segmentItem, reviewScope === s ? styles.segmentOn : null]}
                >
                  <Text variant="small" tone={reviewScope === s ? "inverse" : "muted"}>
                    {s === "vehicle"
                      ? `Ce véhicule (${vehicleReviews.length})`
                      : `L'agence (${allReviews.length})`}
                  </Text>
                </Pressable>
              ))}
            </View>
          }
        >
          {reviews.isPending ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : shownReviews.length === 0 ? (
            <Text variant="sm" tone="muted">
              Pas encore d'avis pour {reviewScope === "vehicle" ? "ce véhicule" : "cette agence"}.
            </Text>
          ) : (
            <>
              <FlatList
                key={reviewScope}
                data={shownReviews}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={reviewW + reviewGap}
                decelerationRate="fast"
                keyExtractor={(r) => r.id}
                ItemSeparatorComponent={() => <View style={{ width: reviewGap }} />}
                onMomentumScrollEnd={(e) =>
                  setReviewIndex(Math.round(e.nativeEvent.contentOffset.x / (reviewW + reviewGap)))
                }
                renderItem={({ item }) => (
                  <ReviewCard
                    review={item}
                    width={reviewW}
                    showVehicle={reviewScope === "agency"}
                  />
                )}
              />
              {shownReviews.length > 1 ? (
                <View style={styles.dots}>
                  {shownReviews.map((r, i) => (
                    <View
                      key={r.id}
                      style={[styles.dot, i === reviewIndex ? styles.dotOn : null]}
                    />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </Section>
        <View style={{ height: 96 + insets.bottom }} />
      </Screen>

      <View style={[styles.bar, { paddingBottom: insets.bottom + theme.space["3"] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Écrire à l'agence"
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
          {estimate && v.available !== false ? (
            <>
              <View style={styles.ctaDivider} />
              <Animated.View style={{ opacity: priceFade }}>
                <Text
                  variant={estimate.total !== null ? "bodyStrong" : "small"}
                  style={styles.ctaText}
                  numberOfLines={1}
                >
                  {estimate.total !== null ? formatEuros(estimate.total) : estimate.note}
                </Text>
              </Animated.View>
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

/** Carte d'avis du carrousel : etoiles et note sur 5, auteur, date, vehicule si filtre agence. */
function ReviewCard({
  review,
  width,
  showVehicle,
}: {
  review: Review;
  width: number;
  showVehicle: boolean;
}) {
  return (
    <View style={[styles.review, { width }]}>
      <View style={styles.reviewHead}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={13}
              color={theme.colors.text}
              fill={n <= review.rating ? theme.colors.text : "transparent"}
            />
          ))}
          <Text variant="smStrong" style={styles.ratingOutOf}>
            {review.rating}/5
          </Text>
        </View>
        <Text variant="small" tone="muted">
          {review.customerName} · {new Date(review.createdAt).toLocaleDateString("fr-FR")}
        </Text>
      </View>
      {showVehicle && review.vehicleLabel ? (
        <Text variant="small" tone="dim">
          {review.vehicleLabel}
        </Text>
      ) : null}
      {review.comment ? (
        <Text variant="sm" numberOfLines={4}>
          {review.comment}
        </Text>
      ) : (
        <Text variant="sm" tone="dim">
          Sans commentaire.
        </Text>
      )}
      {review.reply ? (
        <View style={styles.reply}>
          <Text variant="small" tone="muted" numberOfLines={2}>
            Réponse du loueur : {review.reply}
          </Text>
        </View>
      ) : null}
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

/** Tuile repliable (Description, Tarif) : titre, resume sur une ligne, fleche ; le detail s'ouvre dessous. */
function Tile({
  title,
  hint,
  open,
  onPress,
}: {
  title: string;
  hint: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${open ? "Replier" : "Voir"} : ${title}`}
      onPress={onPress}
      style={[styles.tile, open ? styles.tileOn : null]}
    >
      <View style={styles.tileHead}>
        <Text variant="bodyStrong" style={styles.flex}>
          {title}
        </Text>
        <View style={[styles.chevron, open ? styles.chevronOpen : null]}>
          <ChevronDown size={16} color={theme.colors.text} />
        </View>
      </View>
      <Text variant="small" tone="muted" numberOfLines={1}>
        {hint}
      </Text>
    </Pressable>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {right ? (
        <View style={styles.sectionHead}>
          <Text variant="h2" style={styles.flex}>
            {title}
          </Text>
          {right}
        </View>
      ) : (
        <Text variant="h2">{title}</Text>
      )}
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
  sectionHead: { flexDirection: "row", alignItems: "center", gap: theme.space["3"] },
  wheels: { flexDirection: "row", gap: theme.space["2"] },
  tiles: { flexDirection: "row", gap: theme.space["2"] },
  descriptionText: {
    padding: theme.space["4"],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tile: {
    flex: 1,
    gap: 4,
    padding: theme.space["3"],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tileOn: { borderColor: theme.colors.text },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusRule: { height: 1, backgroundColor: theme.colors.border, marginTop: theme.space["2"] },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: theme.space["1"],
    paddingBottom: theme.space["1"],
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentItem: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: theme.radius.full,
    justifyContent: "center",
  },
  segmentOn: { backgroundColor: theme.colors.text },
  review: {
    gap: theme.space["2"],
    padding: theme.space["3"],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reviewHead: { gap: 2 },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingOutOf: { marginLeft: 6 },
  reply: {
    paddingLeft: theme.space["3"],
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
  },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.border },
  dotOn: { backgroundColor: theme.colors.text, width: 16 },
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
    backgroundColor: theme.colors.background,
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
