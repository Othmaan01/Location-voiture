import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export class UploadError extends Error {
  constructor(
    public readonly status: number,
    body: string,
  ) {
    super(body || `Televersement refuse (${status})`);
    this.name = "UploadError";
  }
}

/**
 * Televersement vers une URL signee Supabase Storage, en natif (expo-file-system) :
 * le fichier part tel quel en corps binaire, avec le bon Content-Type. Le serveur
 * a emis l'URL pour un chemin precis ; l'API verifie ensuite que le fichier existe.
 */
export async function uploadToSignedUrl(
  uploadUrl: string,
  token: string,
  fileUri: string,
  mimeType: string,
): Promise<void> {
  const result = await FileSystem.uploadAsync(
    `${uploadUrl}?token=${encodeURIComponent(token)}`,
    fileUri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": mimeType },
    },
  );
  if (result.status < 200 || result.status >= 300) {
    let message = "";
    try {
      message = (JSON.parse(result.body) as { message?: string }).message ?? "";
    } catch {
      message = result.body.slice(0, 200);
    }
    throw new UploadError(result.status, message);
  }
}

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: "image/jpeg";
}

/**
 * Choisit une photo dans la galerie et la reduit a 1600 px de large max, en JPEG.
 * On ne televerse jamais une photo 4K pour afficher une miniature (brief § 32).
 */
export async function pickAndPrepareImage(): Promise<PickedImage | null> {
  const asset = await pickImageAsset();
  return asset ? prepareImage(asset) : null;
}

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
}

/** Choisit une photo dans la galerie, telle quelle (pour un recadrage a la main avant preparation). */
export async function pickImageAsset(): Promise<ImageAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsMultipleSelection: false,
    exif: false,
  });
  const a = result.canceled ? null : result.assets[0];
  if (!a) return null;
  return { uri: a.uri, width: a.width ?? 1600, height: a.height ?? 1200 };
}

export type CapturedMedia =
  | (PickedImage & { kind: "photo" })
  | {
      kind: "video";
      uri: string;
      sizeBytes: number;
      mimeType: "video/mp4" | "video/quicktime";
      durationSeconds: number;
    };

/** Reduit a 1600 px de large max, JPEG 82 % ; renvoie le poids reel a declarer a l'API. */
export async function prepareImage(asset: { uri: string; width?: number }): Promise<PickedImage> {
  const targetWidth = Math.min(asset.width ?? 1600, 1600);
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: targetWidth } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  const size = (await (await fetch(manipulated.uri)).blob()).size;
  return {
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
    sizeBytes: size,
    mimeType: "image/jpeg",
  };
}

/**
 * Story en direct (ADR-0016) : ouvre la camera, photo ou video au choix ; la video s'arrete
 * toute seule a `maxSeconds`. Rien n'est lu dans la galerie. Retourne null si annule ou refuse.
 */
export async function captureStoryMedia(maxSeconds: number): Promise<CapturedMedia | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images", "videos"],
    videoMaxDuration: maxSeconds,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
    quality: 0.9,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.type === "video") {
    const info = await FileSystem.getInfoAsync(asset.uri);
    const sizeBytes =
      info.exists && typeof info.size === "number" ? info.size : (asset.fileSize ?? 0);
    const mimeType = asset.uri.toLowerCase().endsWith(".mp4") ? "video/mp4" : "video/quicktime";
    const durationSeconds = Math.min(
      maxSeconds,
      Math.max(1, Math.round((asset.duration ?? maxSeconds * 1000) / 1000)),
    );
    return { kind: "video", uri: asset.uri, sizeBytes, mimeType, durationSeconds };
  }
  return { kind: "photo", ...(await prepareImage(asset)) };
}

export interface PickedDocument {
  uri: string;
  name: string;
  sizeBytes: number;
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
}

const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

/** Choisit un PDF ou une image (documents d'entreprise). */
export async function pickDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...ALLOWED_DOC_TYPES],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mimeType = (ALLOWED_DOC_TYPES as readonly string[]).includes(asset.mimeType ?? "")
    ? (asset.mimeType as PickedDocument["mimeType"])
    : "application/pdf";
  return { uri: asset.uri, name: asset.name, sizeBytes: asset.size ?? 0, mimeType };
}
