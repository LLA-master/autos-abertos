#!/bin/zsh
# Espera o OCR terminar e reconstrói corpus -> mencoes -> grafo.
W="${BMDB_WORK:-./work}"; L="$W/_logs/rebuild.log"; echo $$ > "$W/_logs/rebuild.pid"
echo "$(date -u +%H:%M:%S) armado, esperando ocr.done" >> "$L"
until [ -f "$W/ocr.done" ]; do sleep 60; done
cd "$W"
for s in stage3_corpus stage4_regex stage5_graph; do
  echo "$(date -u +%H:%M:%S) $s" >> "$L"
  .venv/bin/python scripts/$s.py > "_logs/$s.rebuild.out" 2>&1 || { echo "$(date -u +%H:%M:%S) FALHA em $s" >> "$L"; exit 1; }
done
echo "$(date -u +%H:%M:%S) REBUILD_OK" >> "$L"
