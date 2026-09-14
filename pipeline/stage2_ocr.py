#!/usr/bin/env python3
"""Estágio 2: OCR apenas das páginas-imagem apontadas no manifesto, fundido ao texto do estágio 1.
Saída: work/ocr/<processo>/<seq>_<id>.txt (texto completo, páginas separadas por \\f) + work/ocr_done.jsonl"""
import os, re, json, subprocess, time, shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
RAW=os.environ.get("BMDB_RAW","./arquivos"); W=os.environ.get("BMDB_WORK","./work")
MAN=f"{W}/manifest.jsonl"; LOG=f"{W}/_logs/stage2.log"; PID=f"{W}/_logs/stage2.pid"; DONE=f"{W}/ocr_done.jsonl"
TMP=f"{W}/_tmp"; os.environ["TMPDIR"]=TMP
open(PID,"w").write(str(os.getpid()))
def log(m):
    with open(LOG,"a") as f: f.write(f"{time.strftime('%H:%M:%S')} {m}\n")
def ranges(pages):
    pages=sorted(set(pages)); out=[]; s=e=pages[0]
    for p in pages[1:]:
        if p==e+1: e=p
        else: out.append(f"{s}-{e}" if s!=e else str(s)); s=e=p
    out.append(f"{s}-{e}" if s!=e else str(s)); return ",".join(out)
def one(rec):
    src=f"{RAW}/{rec['rel']}"; img=rec["image_pages"]; npg=rec["pages"] or 0
    od=f"{W}/ocr/{rec['pasta']}"; os.makedirs(od,exist_ok=True)
    outp=f"{od}/{os.path.basename(rec['text_path'])}"
    tmpd=f"{TMP}/ocr_{rec['id']}"; os.makedirs(tmpd,exist_ok=True)
    side=f"{tmpd}/side.txt"; opdf=f"{tmpd}/out.pdf"
    t0=time.time()
    cmd=["ocrmypdf","-l","por","--pages",ranges(img),"--skip-text","--invalidate-digital-signatures","--sidecar",side,
         "--output-type","pdf","--optimize","0","--jobs","2","-q",src,opdf]
    r=subprocess.run(cmd,capture_output=True,text=True,timeout=7200)
    if r.returncode not in (0,6,10) or not os.path.exists(side):
        shutil.rmtree(tmpd,ignore_errors=True)
        return {"id":rec["id"],"rel":rec["rel"],"ok":False,"rc":r.returncode,"err":r.stderr[-300:],"secs":round(time.time()-t0)}
    base=open(f"{W}/{rec['text_path']}",encoding="utf-8").read().split("\f")
    while len(base)<npg: base.append("")
    sp=open(side,encoding="utf-8",errors="replace").read().split("\f")
    gained=0
    if len(sp)>=npg:
        for p in img:
            t=sp[p-1]
            if "[OCR skipped" in t: continue
            base[p-1]=t; gained+=len(re.sub(r"\s","",t))
    else:
        ocr_only=[t for t in sp if t.strip() and "[OCR skipped" not in t]
        for p,t in zip(img,ocr_only): base[p-1]=t; gained+=len(re.sub(r"\s","",t))
    with open(outp,"w",encoding="utf-8") as f: f.write("\f".join(base))
    shutil.rmtree(tmpd,ignore_errors=True)
    return {"id":rec["id"],"rel":rec["rel"],"ok":True,"rc":r.returncode,"img_pages":len(img),"chars_gained":gained,"secs":round(time.time()-t0),"out":os.path.relpath(outp,W)}
def main():
    while not os.path.exists(f"{W}/manifest.done"): time.sleep(60)
    done=set()
    if os.path.exists(DONE):
        for line in open(DONE):
            try:
                d=json.loads(line)
                if d.get("ok"): done.add(d["id"])
            except Exception: pass
    todo=[]
    for line in open(MAN,encoding="utf-8"):
        r=json.loads(line)
        if r["ext"]=="pdf" and r.get("image_pages") and r["id"] not in done: todo.append(r)
    todo.sort(key=lambda r:(len(r["image_pages"]),r["bytes"]))
    tot=sum(len(r["image_pages"]) for r in todo)
    log(f"inicio: {len(todo)} PDFs, {tot} paginas-imagem a OCRizar ({len(done)} ja feitos)")
    n=0; t0=time.time(); pg=0
    with ThreadPoolExecutor(max_workers=4) as ex, open(DONE,"a") as out:
        futs={ex.submit(one,r):r for r in todo}
        for fu in as_completed(futs):
            r=futs[fu]
            try: d=fu.result()
            except Exception as e: d={"id":r["id"],"rel":r["rel"],"ok":False,"err":repr(e)[-300:]}
            out.write(json.dumps(d,ensure_ascii=False)+"\n"); out.flush()
            n+=1; pg+=len(r["image_pages"])
            if not d.get("ok"): log(f"FALHA {r['rel']}: rc={d.get('rc')} {d.get('err','')[-120:]}")
            if n%25==0: log(f"{n}/{len(todo)} PDFs, {pg}/{tot} pags ({time.time()-t0:.0f}s)")
    log(f"fim: {n} PDFs em {time.time()-t0:.0f}s")
    open(f"{W}/ocr.done","w").write(time.strftime("%Y-%m-%dT%H:%M:%S"))
if __name__=="__main__": main()
