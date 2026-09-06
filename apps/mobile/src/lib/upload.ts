import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

/**
 * Televersement vers une URL signee Supabase Storage.
 * Le serveur a emis l'URL pour un chemin precis ; on envoie le fichier en PUT,
 * puis on confirme aupres de l'API, qui verifie que le fichier existe bien.
 */
export async function uploadToSignedUrl(
  uploadUrl: string,
  token: string,
  fileUri: string,
  mimeType: string,
): Promise<void> {
  const blob = await (await fetch(fileUri)).blob();
  const response = await fetch(`${uploadUrl}?token=${encodeURIComponent(token)}`, {
    method: "PUT",
    headers: { "Content-Type": mimeType, "x-upsert": "false" },
    body: blob,
  });
  if (!response.ok) throw new Error(`Televersement refuse (${response.status})`);
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
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsMultipleSelection: false,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
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
