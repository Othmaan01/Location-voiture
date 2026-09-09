import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { CAR_SKETCH, DAMAGE_LABEL, type Damage, type Signature } from "@lv/contracts";

/**
 * PDF d'etat des lieux (ADR-0018), genere sans navigateur : une page A4, le croquis
 * partage avec l'app, les dommages numerotes, la signature du client tracee a l'identique.
 */
export interface InspectionPdfInput {
  kind: "departure" | "return";
  organizationName: string;
  agencyLine: string | null;
  vehicleLabel: string;
  licensePlate: string | null;
  customerName: string;
  period: { from: Date; to: Date };
  mileageKm: number | null;
  fuelEighths: number | null;
  damages: Damage[];
  comment: string | null;
  staffName: string | null;
  customerSignature: Signature;
  createdAt: Date;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 44;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.45, 0.45, 0.5);
const RED = rgb(0.89, 0.14, 0.23);
const LINE = rgb(0.8, 0.8, 0.84);

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});
/** Helvetica standard ne connait que Latin-1 : tout autre caractere devient « ? ». */
const clean = (s: string) => s.replace(/[^ -ÿ]/g, "?");

export async function renderInspectionPdf(input: InspectionPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Etat des lieux ${input.kind === "departure" ? "de depart" : "de retour"}`);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = PAGE_H - MARGIN;
  const text = (
    s: string,
    x: number,
    size: number,
    opts: { bold?: boolean; muted?: boolean } = {},
  ) =>
    page.drawText(clean(s), {
      x,
      y,
      size,
      font: opts.bold ? bold : font,
      color: opts.muted ? MUTED : INK,
    });

  text(
    input.kind === "departure" ? "État des lieux de départ" : "État des lieux de retour",
    MARGIN,
    20,
    { bold: true },
  );
  y -= 18;
  text(`${input.organizationName}${input.agencyLine ? ` · ${input.agencyLine}` : ""}`, MARGIN, 10, {
    muted: true,
  });
  y -= 26;

  const row = (label: string, value: string) => {
    text(label, MARGIN, 9, { muted: true });
    text(value, MARGIN + 120, 10, { bold: true });
    y -= 16;
  };
  row("Véhicule", `${input.vehicleLabel}${input.licensePlate ? ` · ${input.licensePlate}` : ""}`);
  row("Client", input.customerName);
  row("Location", `du ${fmt.format(input.period.from)} au ${fmt.format(input.period.to)}`);
  row(
    "Kilométrage",
    input.mileageKm !== null ? `${input.mileageKm.toLocaleString("fr-FR")} km` : "non relevé",
  );
  row("Carburant", input.fuelEighths !== null ? `${input.fuelEighths}/8` : "non relevé");
  row("Établi le", fmt.format(input.createdAt));
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.6,
    color: LINE,
  });
  y -= 18;

  // Croquis a 55 % dans la colonne de gauche ; liste des dommages a droite.
  const scale = 0.55;
  const sketchTop = y;
  const sketchH = CAR_SKETCH.height * scale;
  for (const d of CAR_SKETCH.paths) {
    page.drawSvgPath(d, { x: MARGIN, y: sketchTop, scale, borderColor: INK, borderWidth: 1.1 });
  }
  for (const label of CAR_SKETCH.labels) {
    page.drawText(clean(label.text), {
      x: MARGIN + label.x * CAR_SKETCH.width * scale - 16,
      y: sketchTop - label.y * sketchH - (label.y > 0.5 ? 10 : -2),
      size: 7,
      font: bold,
      color: MUTED,
    });
  }
  input.damages.forEach((d, i) => {
    const cx = MARGIN + d.x * CAR_SKETCH.width * scale;
    const cy = sketchTop - d.y * sketchH;
    page.drawCircle({ x: cx, y: cy, size: 7, color: RED });
    page.drawText(String(i + 1), {
      x: cx - (i + 1 >= 10 ? 5 : 2.5),
      y: cy - 3,
      size: 8,
      font: bold,
      color: rgb(1, 1, 1),
    });
  });

  const colX = MARGIN + CAR_SKETCH.width * scale + 30;
  let cy = sketchTop - 4;
  page.drawText("Dommages relevés", { x: colX, y: cy, size: 11, font: bold, color: INK });
  cy -= 16;
  if (input.damages.length === 0) {
    page.drawText("Aucun dommage relevé.", { x: colX, y: cy, size: 10, font, color: MUTED });
    cy -= 14;
  }
  input.damages.forEach((d, i) => {
    const label = DAMAGE_LABEL[d.type];
    page.drawText(clean(`${i + 1}. ${label}${d.note ? ` - ${d.note}` : ""}`), {
      x: colX,
      y: cy,
      size: 10,
      font,
      color: INK,
      maxWidth: PAGE_W - MARGIN - colX,
      lineHeight: 12,
    });
    cy -= d.note && d.note.length > 40 ? 26 : 14;
  });
  y = Math.min(sketchTop - sketchH, cy) - 26;

  page.drawText("Commentaire", { x: MARGIN, y, size: 11, font: bold, color: INK });
  y -= 14;
  const comment = input.comment?.trim() || "-";
  page.drawText(clean(comment), {
    x: MARGIN,
    y,
    size: 10,
    font,
    color: INK,
    maxWidth: PAGE_W - 2 * MARGIN,
    lineHeight: 13,
  });
  const lines = Math.min(8, Math.ceil(comment.length / 95) + (comment.match(/\n/g)?.length ?? 0));
  y -= 13 * lines + 18;

  drawSignature(page, input.customerSignature, MARGIN, y, 200, 80);
  page.drawText(clean(`Signature du client · ${input.customerName}`), {
    x: MARGIN,
    y: y - 92,
    size: 8,
    font,
    color: MUTED,
  });
  if (input.staffName)
    page.drawText(clean(`Établi par ${input.staffName} pour ${input.organizationName}`), {
      x: MARGIN + 260,
      y: y - 92,
      size: 8,
      font,
      color: MUTED,
    });

  page.drawText(
    clean("Document généré par l'application ; constat contradictoire signé sur écran."),
    { x: MARGIN, y: 30, size: 7, font, color: MUTED },
  );
  return doc.save();
}

function drawSignature(
  page: PDFPage,
  strokes: Signature,
  x: number,
  top: number,
  w: number,
  h: number,
) {
  page.drawRectangle({ x, y: top - h, width: w, height: h, borderColor: LINE, borderWidth: 0.6 });
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const [ax, ay] = stroke[i - 1]!;
      const [bx, by] = stroke[i]!;
      page.drawLine({
        start: { x: x + ax * w, y: top - ay * h },
        end: { x: x + bx * w, y: top - by * h },
        thickness: 1.4,
        color: INK,
      });
    }
  }
}
