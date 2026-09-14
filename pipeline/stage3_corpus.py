#!/usr/bin/env python3
"""Estágio 3: consolida manifesto + texto por página em Parquet (docs.parquet, pages.parquet).
Usa texto do OCR (work/ocr) quando existir, senão o do estágio 1 (work/text)."""
import os, json, re, time
import pyarrow as pa, pyarrow.parquet as pq
import os
W=os.environ.get("BMDB_WORK","./work"); LOG=f"{W}/_logs/stage3.log"
def log(m):
    with open(LOG,"a") as f: f.write(f"{time.strftime('%H:%M:%S')} {m}\n")
t0=time.time(); docs=[]; rows=[]; n_ocr=0
for line in open(f"{W}/manifest.jsonl",encoding="utf-8"):
    r=json.loads(line)
    docs.append({k:r.get(k) for k in ["id","processo","pasta","seq","tipo","subtipo","arquivo","rel","ext","bytes","sha256","pages","chars","has_text","producer","creator","created"]}|{"n_image_pages":len(r.get("image_pages") or [])})
    if r["ext"]!="pdf" or not r.get("text_path"): continue
    tp=f"{W}/{r['text_path']}"; op=f"{W}/ocr/{r['pasta']}/{os.path.basename(r['text_path'])}"
    src="ocr" if os.path.exists(op) else "text"
    if src=="ocr": n_ocr+=1
    txt=open(op if src=="ocr" else tp,encoding="utf-8",errors="replace").read()
    for i,pg in enumerate(txt.split("\f"),1):
        clean=re.sub(r"[ \t]+"," ",pg).strip()
        rows.append({"doc_id":r["id"],"processo":r["processo"],"seq":r["seq"],"tipo":r["tipo"],"page":i,
                     "chars":len(re.sub(r"\s","",clean)),"src":src,"text":clean})
pq.write_table(pa.Table.from_pylist(docs),f"{W}/corpus/docs.parquet",compression="zstd")
pq.write_table(pa.Table.from_pylist(rows),f"{W}/corpus/pages.parquet",compression="zstd")
log(f"docs={len(docs)} pages={len(rows)} com_ocr={n_ocr} em {time.time()-t0:.0f}s")
open(f"{W}/corpus/built.txt","w").write(time.strftime("%Y-%m-%dT%H:%M:%S"))
