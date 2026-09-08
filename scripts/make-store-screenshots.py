"""Met des captures d'ecran aux dimensions exigees par l'App Store.

Apple n'accepte que des tailles exactes. On redimensionne sans deformer, puis on
complete avec le noir de l'application. Les captures d'un iPhone plus petit sont
agrandies : c'est accepte, la nettete reste bonne.

    python3 scripts/make-store-screenshots.py ~/Downloads/IMG_*.PNG
"""

import sys
from pathlib import Path
from PIL import Image

BACKGROUND = (14, 14, 17)
SIZES = {"6.9": (1320, 2868), "6.5": (1242, 2688)}
OUT = Path("apps/mobile/store/screenshots")


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = size
    ratio = min(w / image.width, h / image.height)
    resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.LANCZOS)
    canvas = Image.new("RGB", size, BACKGROUND)
    canvas.paste(resized, ((w - resized.width) // 2, (h - resized.height) // 2))
    return canvas


def main(paths: list[str]) -> None:
    if not paths:
        raise SystemExit("Usage : python3 scripts/make-store-screenshots.py <images...>")
    for label, size in SIZES.items():
        (OUT / label).mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(sorted(paths), start=1):
        source = Image.open(path).convert("RGB")
        for label, size in SIZES.items():
            target = OUT / label / f"{index:02d}.png"
            fit(source, size).save(target)
            print(target, size)


if __name__ == "__main__":
    main(sys.argv[1:])
