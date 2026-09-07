"""Genere les images de l'application (icone App Store, icone adaptative Android, splash).

Marque : pastille noire, epingle rouge de la carte, calandre de voiture en creux.
Rendu 4x puis reduction, pour des bords nets sans outil externe.
Relancer apres tout changement de palette :  python3 scripts/make-app-icons.py
"""

from PIL import Image, ImageDraw, ImageFilter

BLACK_1 = (14, 14, 17)
BLACK_0 = (8, 8, 10)
RED = (227, 36, 59)
RED_DARK = (179, 23, 44)
RED_TINT = (255, 92, 109)
S = 4096  # toile de travail (4x la sortie 1024)


def _hex(c):
    return c


def _vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size), top)
    px = grad.load()
    for y in range(size):
        t = y / (size - 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return grad.resize((size, size))


def _red_glow(size):
    """Halo rouge diffus derriere la marque, comme le fond de l'application."""
    glow = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(glow)
    cx, cy, r = size * 0.5, size * 0.42, size * 0.34
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=110)
    return glow.filter(ImageFilter.GaussianBlur(size * 0.16))


def _pin_mask(size, scale=1.0, dy=0.0):
    """Epingle de carte : tete ronde + pointe, en masque pour pouvoir la peindre en degrade."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    cx = size * 0.5
    cy = size * (0.44 + dy)
    r = size * 0.20 * scale
    tip_y = cy + r * 2.05
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    half = r * 0.70
    d.polygon([(cx - half, cy + r * 0.50), (cx + half, cy + r * 0.50), (cx, tip_y)], fill=255)
    return mask


def _car_mask(size, scale=1.0, dy=0.0):
    """Calandre vue de face, evidee dans la tete de l'epingle : elle doit tenir dans le disque."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    cx = size * 0.5
    cy = size * (0.44 + dy)
    u = size * 0.20 * scale  # rayon de la tete
    body_w, body_h = u * 0.60, u * 0.23
    # caisse
    d.rounded_rectangle(
        [cx - body_w, cy - body_h * 0.05, cx + body_w, cy + body_h * 1.15],
        radius=u * 0.11,
        fill=255,
    )
    # pavillon
    d.polygon(
        [
            (cx - body_w * 0.80, cy),
            (cx - body_w * 0.50, cy - body_h * 1.30),
            (cx + body_w * 0.50, cy - body_h * 1.30),
            (cx + body_w * 0.80, cy),
        ],
        fill=255,
    )
    # roues
    for sign in (-1, 1):
        wx = cx + sign * body_w * 0.66
        d.ellipse(
            [wx - u * 0.16, cy + body_h * 0.95, wx + u * 0.16, cy + body_h * 1.60],
            fill=255,
        )
    return mask


def build_mark(size, background=True, scale=1.0, dy=0.0):
    if background:
        img = _vertical_gradient(size, (20, 20, 26), BLACK_0).convert("RGB")
        img.paste(Image.new("RGB", (size, size), (60, 12, 20)), (0, 0), _red_glow(size))
    else:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    pin_paint = _vertical_gradient(size, RED_TINT, RED_DARK).convert("RGB")
    pin = _pin_mask(size, scale, dy)
    car = _car_mask(size, scale, dy)

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(pin_paint, (0, 0), pin)
    # La calandre est evidee : on retire le dessin de voiture du masque de l'epingle.
    hole = Image.new("RGBA", (size, size), BLACK_1 + (255,))
    layer.paste(hole, (0, 0), car)
    if not background:
        # Sur fond transparent, l'evidement doit rester transparent.
        alpha = layer.split()[3]
        alpha.paste(0, (0, 0), car)
        layer.putalpha(alpha)

    img = img.convert("RGBA")
    img.alpha_composite(layer)
    return img


def save(img, path, out_size, flatten):
    out = img.resize((out_size, out_size), Image.LANCZOS)
    if flatten:
        bg = Image.new("RGB", out.size, BLACK_1)
        bg.paste(out, (0, 0), out)
        out = bg
    out.save(path)
    print(path, out.size, out.mode)


if __name__ == "__main__":
    base = "apps/mobile/assets"
    # Icone App Store : 1024x1024, opaque, sans transparence (exigence Apple).
    save(build_mark(S), f"{base}/icon.png", 1024, flatten=True)
    # Android : le premier plan doit tenir dans les 66 % centraux.
    save(build_mark(S, background=False, scale=0.72), f"{base}/adaptive-icon.png", 1024, flatten=False)
    # Ecran de lancement : marque seule sur fond transparent, le fond vient de la config.
    save(build_mark(S, background=False, scale=0.9), f"{base}/splash.png", 1200, flatten=False)
