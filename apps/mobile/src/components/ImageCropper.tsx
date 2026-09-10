import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Text } from "@/components/ui";
import { theme } from "@/theme";

export interface CropSource {
  uri: string;
  width: number;
  height: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

/**
 * Recadrage a la main (retour, 2026-09-10) : cadre au format demande, glisser pour cadrer,
 * pincer pour zoomer. Le resultat est decoupe dans l'image d'origine, jamais etire.
 */
export function ImageCropper({
  source,
  aspect = 4 / 3,
  title = "Cadrez la photo",
  onCancel,
  onDone,
}: {
  source: CropSource | null;
  aspect?: number;
  title?: string;
  onCancel: () => void;
  onDone: (result: CropSource) => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const frameW = screenW - 2 * theme.space["4"];
  const frameH = Math.round(frameW / aspect);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 });
  const live = useRef(view);
  const start = useRef({ zoom: 1, tx: 0, ty: 0, dist: 0, cx: 0, cy: 0 });
  live.current = view;

  // Echelle de base : l'image couvre tout le cadre (jamais de bande vide).
  const base = source ? Math.max(frameW / source.width, frameH / source.height) : 1;
  const clamp = (zoom: number, tx: number, ty: number) => {
    if (!source) return { zoom, tx, ty };
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const dispW = source.width * base * z;
    const dispH = source.height * base * z;
    const maxTx = Math.max(0, (dispW - frameW) / 2);
    const maxTy = Math.max(0, (dispH - frameH) / 2);
    return {
      zoom: z,
      tx: Math.min(maxTx, Math.max(-maxTx, tx)),
      ty: Math.min(maxTy, Math.max(-maxTy, ty)),
    };
  };
  const touchesOf = (e: GestureResponderEvent) => e.nativeEvent.touches;
  const distance = (e: GestureResponderEvent) => {
    const t = touchesOf(e);
    if (t.length < 2) return 0;
    return Math.hypot(t[0]!.pageX - t[1]!.pageX, t[0]!.pageY - t[1]!.pageY);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          start.current = { ...live.current, dist: distance(e), cx: 0, cy: 0 };
        },
        onPanResponderMove: (e, gesture) => {
          const t = touchesOf(e);
          if (t.length >= 2) {
            const d = distance(e);
            if (start.current.dist === 0)
              start.current = { ...live.current, dist: d, cx: 0, cy: 0 };
            const ratio = start.current.dist > 0 ? d / start.current.dist : 1;
            setView(clamp(start.current.zoom * ratio, start.current.tx, start.current.ty));
            return;
          }
          setView(
            clamp(live.current.zoom, start.current.tx + gesture.dx, start.current.ty + gesture.dy),
          );
        },
        onPanResponderRelease: () => {
          start.current = { ...live.current, dist: 0, cx: 0, cy: 0 };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, frameW, frameH],
  );

  if (!source) return null;
  const scale = base * view.zoom;
  const dispW = source.width * scale;
  const dispH = source.height * scale;
  const left = (frameW - dispW) / 2 + view.tx;
  const top = (frameH - dispH) / 2 + view.ty;

  const done = async () => {
    setBusy(true);
    try {
      // Zone visible du cadre, en pixels de l'image d'origine.
      const originX = Math.max(0, Math.round(-left / scale));
      const originY = Math.max(0, Math.round(-top / scale));
      const width = Math.min(source.width - originX, Math.round(frameW / scale));
      const height = Math.min(source.height - originY, Math.round(frameH / scale));
      const out = await ImageManipulator.manipulateAsync(
        source.uri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );
      onDone({ uri: out.uri, width: out.width, height: out.height });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top + theme.space["3"] }]}>
        <View style={styles.head}>
          <Text variant="h2">{title}</Text>
          <Text variant="small" tone="muted">
            Glissez pour cadrer, pincez pour zoomer.
          </Text>
        </View>
        <View style={styles.stage}>
          <View
            style={[styles.frame, { width: frameW, height: frameH }]}
            {...responder.panHandlers}
          >
            <Image
              source={{ uri: source.uri }}
              style={{ position: "absolute", left, top, width: dispW, height: dispH }}
              contentFit="fill"
            />
            <View pointerEvents="none" style={styles.gridV} />
            <View pointerEvents="none" style={[styles.gridV, styles.gridV2]} />
            <View pointerEvents="none" style={styles.gridH} />
            <View pointerEvents="none" style={[styles.gridH, styles.gridH2]} />
          </View>
        </View>
        <View style={[styles.actions, { paddingBottom: insets.bottom + theme.space["3"] }]}>
          <Button
            label="Recentrer"
            variant="ghost"
            size="sm"
            onPress={() => setView({ zoom: 1, tx: 0, ty: 0 })}
          />
          <View style={styles.actionsRow}>
            <Button label="Annuler" variant="ghost" style={styles.flex} onPress={onCancel} />
            {busy ? (
              <View style={[styles.flex, styles.center]}>
                <ActivityIndicator color={theme.colors.accent} />
              </View>
            ) : (
              <Button label="Valider" style={styles.flex} onPress={() => void done()} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.space["4"] },
  head: { gap: 2, marginBottom: theme.space["3"] },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    overflow: "hidden",
    borderRadius: theme.radius.card,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "33.33%",
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  gridV2: { left: "66.66%" },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "33.33%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  gridH2: { top: "66.66%" },
  actions: { gap: theme.space["2"], paddingTop: theme.space["3"] },
  actionsRow: { flexDirection: "row", gap: theme.space["2"] },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", minHeight: 50 },
});
