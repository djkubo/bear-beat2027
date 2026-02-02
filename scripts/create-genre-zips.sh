#!/bin/bash
#
# Crea un ZIP por cada carpeta de género (Bachata, Cumbia, etc.) EN EL SERVIDOR
# donde están los videos (FTP/Storage Box). Ejecutar por SSH donde vive la carpeta.
#
# Requisitos en el servidor: zip (apt install zip / yum install zip)
#
# Uso en el servidor:
#   chmod +x create-genre-zips.sh
#   ./create-genre-zips.sh /ruta/a/Videos\ Enero\ 2026
#   ./create-genre-zips.sh /ruta/a/videos /ruta/salida/_ZIPS
#
# Luego sube los .zip de _ZIPS a Bunny (p. ej. packs/enero-2026/).

set -e
BASE="${1:-.}"
OUT="${2:-$BASE/_ZIPS}"

if [ ! -d "$BASE" ]; then
  echo "❌ Carpeta no encontrada: $BASE"
  echo "Uso: $0 <carpeta-videos> [carpeta-salida]"
  exit 1
fi

if ! command -v zip &> /dev/null; then
  echo "❌ Necesitas 'zip'. Instala con: apt install zip   o   yum install zip"
  exit 1
fi

mkdir -p "$OUT"
# Ruta absoluta de salida para que funcione después del cd
OUT_ABS=$(cd "$(dirname "$OUT")" 2>/dev/null && pwd)/$(basename "$OUT")
echo "✓ Videos: $BASE"
echo "✓ Salida: $OUT_ABS"
echo ""

cd "$BASE"
for dir in */; do
  [ -d "$dir" ] || continue
  name="${dir%/}"
  # Solo si hay al menos un video
  if ls "${dir}"*.mp4 "${dir}"*.mov "${dir}"*.avi "${dir}"*.mkv 2>/dev/null | head -1 | grep -q .; then
    zip -r -q "$OUT_ABS/${name}.zip" "$name"
    count=$(find "$dir" -maxdepth 1 -type f \( -iname "*.mp4" -o -iname "*.mov" -o -iname "*.avi" -o -iname "*.mkv" \) | wc -l)
    size=$(du -h "$OUT_ABS/${name}.zip" | cut -f1)
    echo "✓ ${name}.zip – $count archivos, $size"
  else
    echo "⊘ $name – sin videos, omitido"
  fi
done

echo ""
echo "Listo. Sube los ZIP de $OUT_ABS a Bunny (ej. packs/enero-2026/) para que /api/download?file=GenreName.zip funcione."
