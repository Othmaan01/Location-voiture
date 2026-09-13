"""Genere toutes les declinaisons de la marque Karson (application et site) a partir des sources.

Sources (brand/) :
  sources/karson-k-jour.jpg        K sur fond blanc (rendu 4096, valide le 2026-09-13)
  sources/karson-k-nuit.jpg        K sur fond noir (rendu 4096, valide le 2026-09-13)
  masters/karson-logo-nuit-4096.png logo complet nuit corrige (fond noir pur, mot a la largeur du K)

Usage : python3 brand/generate.py   (depuis la racine du depot ; necessite numpy, scipy, Pillow)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
BRAND, MOBILE, WEB = ROOT / "brand", ROOT / "apps/mobile/assets", ROOT / "apps/web/public"

DX, DY = -78, 22                                      # recentrage applique au logo complet
SHAPE = (705 + DX, 3546 + DX, 648 + DY, 2942 + DY)    # emprise de la forme du K (repere final)
GLOW_X = (471 + DX, 3547 + DX)                        # emprise horizontale avec la lueur
ICON_RATIO = 0.56                                      # largeur du K dans l'icone iPhone
BG_APP_DARK, BG_APP_LIGHT = (14, 14, 17), (244, 244, 246)   # fond du premier ecran (tokens black.1 / light.ground.1)
INK_LIGHT, RED = (20, 20, 24), (227, 36, 59)


def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def shift(img, dx, dy, fill):
    h, w, _ = img.shape
    out = np.full_like(img, fill)
    out[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = img[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    return out


def load_k(mode):
    """Fond ramene exactement au noir ou au blanc pur ; l'art n'est pas modifie."""
    if mode == "dark":
        img = np.asarray(Image.open(BRAND / "sources/karson-k-nuit.jpg").convert("RGB")).astype(np.float64)
        return shift(img * ss(8, 16, img.max(axis=2))[..., None], DX, DY, 0.0)
    img = np.asarray(Image.open(BRAND / "sources/karson-k-jour.jpg").convert("RGB")).astype(np.float64)
    return shift(255 - (255 - img) * ss(4, 10, 255 - img.min(axis=2))[..., None], DX, DY, 255.0)


def to_image(arr, mode="RGB"):
    return Image.fromarray(np.clip(np.round(arr), 0, 255).astype(np.uint8), mode)


def resample(arr, size, box):
    chans = [np.asarray(Image.fromarray(arr[..., c].astype(np.float32), "F").resize((size, size), Image.LANCZOS, box=box))
             for c in range(arr.shape[2])]
    return np.dstack(chans)


def framed(arr, bgv, size, width_ratio, center=None):
    """Cadre carre ou la forme du K occupe width_ratio de la largeur ; centre optique par defaut."""
    sx0, sx1, sy0, sy1 = SHAPE
    cx = ((sx0 + sx1) / 2 + (GLOW_X[0] + GLOW_X[1]) / 2) / 2 if center is None else center[0]
    cy = (sy0 + sy1) / 2 if center is None else center[1]
    side = (sx1 - sx0) / width_ratio
    x0, y0, x1, y1 = cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2
    h, w, _ = arr.shape
    p = int(np.ceil(max(0, -x0, -y0, x1 - w, y1 - h))) + 4
    src = np.pad(arr, ((p, p), (p, p), (0, 0)), constant_values=bgv)
    return resample(src, size, (x0 + p, y0 + p, x1 + p, y1 + p))


def rounded_tile(arr, bgv, size, ratio, radius=0.22):
    img = to_image(framed(arr, bgv, size, ratio))
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * radius), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask.resize((size, size), Image.LANCZOS))
    return clean_transparent(out)


def clean_transparent(im):
    a = np.asarray(im.convert("RGBA")).copy()
    a[a[..., 3] == 0, :3] = 0
    return Image.fromarray(a, "RGBA")


def main():
    k_dark, k_light = load_k("dark"), load_k("light")
    full_dark = np.asarray(Image.open(BRAND / "masters/karson-logo-nuit-4096.png").convert("RGB")).astype(np.float64)

    # Logo complet jour : K jour + mot du master nuit en encre sombre, triangle rouge conserve
    word = full_dark[3120:3520]
    r, g = word[..., 0], word[..., 1]
    tri = ndimage.binary_dilation((r > g + 60) & (r > 60), iterations=3)
    a_letters = np.where(tri, 0, g / 255.0)[..., None]
    a_tri = np.where(tri, np.clip((r - g) / (227 - 36), 0, 1), 0)[..., None]
    full_light = k_light.copy()
    zone = full_light[3120:3520] * (1 - a_letters) + np.array(INK_LIGHT) * a_letters
    full_light[3120:3520] = zone * (1 - a_tri) + np.array(RED) * a_tri
    to_image(full_light).save(BRAND / "masters/karson-logo-jour-4096.png", optimize=True)

    # Application : icones iPhone jour / nuit / teintee, icone Android, ecrans de lancement
    icon_dark = framed(k_dark, 0.0, 1024, ICON_RATIO)
    to_image(framed(k_light, 255.0, 1024, ICON_RATIO)).save(MOBILE / "icon-light.png", optimize=True)
    to_image(icon_dark).save(MOBILE / "icon-dark.png", optimize=True)
    gray = 0.2126 * icon_dark[..., 0] + 0.7152 * icon_dark[..., 1] + 0.0722 * icon_dark[..., 2]
    to_image(np.dstack([gray] * 3)).save(MOBILE / "icon-tinted.png", optimize=True)
    to_image(framed(k_dark, 0.0, 1024, 0.44)).save(MOBILE / "adaptive-icon.png", optimize=True)
    center = ((SHAPE[0] + SHAPE[1]) / 2, 2048)
    sd = framed(full_dark, 0.0, 1536, 0.69 * 0.98, center=center)
    sl = framed(full_light, 255.0, 1536, 0.69 * 0.98, center=center)
    bgd, bgl = np.array(BG_APP_DARK, float), np.array(BG_APP_LIGHT, float)
    to_image(255 - (255 - bgd) * (255 - sd) / 255.0).save(MOBILE / "splash-dark.png", optimize=True)   # superposition « ecran »
    to_image(bgl * sl / 255.0).save(MOBILE / "splash-light.png", optimize=True)                         # superposition « produit »

    # Site : favicons clair / sombre, raccourci iOS, icones PWA, marque d'en-tete transparente, favicon.ico
    (WEB / "brand").mkdir(parents=True, exist_ok=True)
    rounded_tile(k_light, 255.0, 512, 0.66).save(WEB / "icon-light.png", optimize=True)
    icon_dark_tile = rounded_tile(k_dark, 0.0, 512, 0.66)
    icon_dark_tile.save(WEB / "icon-dark.png", optimize=True)
    to_image(framed(k_dark, 0.0, 180, 0.62)).save(WEB / "apple-icon.png", optimize=True)
    rounded_tile(k_dark, 0.0, 512, 0.62).save(WEB / "icon-512.png", optimize=True)
    to_image(framed(k_dark, 0.0, 512, 0.50)).save(WEB / "icon-maskable.png", optimize=True)
    mark = framed(k_dark, 0.0, 512, 0.80)
    alpha = mark.max(axis=2) / 255.0
    rgb = mark / np.maximum(alpha[..., None], 1e-6)
    clean_transparent(to_image(np.dstack([np.clip(rgb, 0, 255), alpha * 255]), "RGBA")).save(WEB / "brand/karson-mark.png", optimize=True)
    icon_dark_tile.save(WEB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("declinaisons Karson generees")


if __name__ == "__main__":
    main()
