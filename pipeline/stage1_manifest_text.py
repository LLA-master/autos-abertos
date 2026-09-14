#!/usr/bin/env python3
"""Estágio 1: manifesto (hash, metadados, páginas) + extração de texto por página.
Saída: work/manifest.jsonl, work/text/<processo>/<seq>_<id>.txt (páginas separadas por \\f)."""
import os, re, sys, json, hashlib, subprocess, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
RAW=os.environ.get("BMDB_RAW","./arquivos"); W=os.environ.get("BMDB_WORK","./work")
MAN=f"{W}/manifest.jsonl"; LOG=f"{W}/_logs/stage1.log"; PID=f"{W}/_logs/stage1.pid"
open(PID,"w").write(str(os.getpid()))
def log(m):
    with open(LOG,"a") as f: f.write(f"{time.strftime('%H:%M:%S')} {m}\n")
FN=re.compile(r"^(\d+) (.+?)_([0-9a-f]{8})\.(pdf|mp4)$", re.I)
def norm_proc(d):
    m=re.match(r"([A-Za-z]+)\s*(\d+)", d); return f"{m.group(1).upper()} {m.group(2)}" if m else d
def sha256(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda: f.read(1<<20), b""): h.update(b)
    return h.hexdigest()
def pdfinfo(p):
    out=subprocess.run(["pdfinfo",p],capture_output=True,text=True,timeout=120).stdout
    d={}
    for line in out.splitlines():
        if ":" in line:
            k,v=line.split(":",1); d[k.strip()]=v.strip()
    return d
def one(p):
    rel=os.path.relpath(p,RAW); proc_dir=rel.split(os.sep)[0]; name=os.path.basename(p)
    m=FN.match(name)
    seq,desc,fid,ext=(m.group(1),m.group(2),m.group(3),m.group(4).lower()) if m else ("","",hashlib.md5(name.encode()).hexdigest()[:8],name.rsplit(".",1)[-1].lower())
    tipo,sub=(desc.split(" - ",1)+[""])[:2] if desc else ("","")
    rec={"id":fid,"processo":norm_proc(proc_dir),"pasta":proc_dir,"seq":int(seq) if seq else None,
         "tipo":tipo.strip(),"subtipo":sub.strip(),"arquivo":name,"rel":rel,"ext":ext,
         "bytes":os.path.getsize(p),"sha256":sha256(p)}
    if ext!="pdf":
        rec.update(pages=None,has_text=None,image_pages=[],chars=0,text_path=None); return rec
    info=pdfinfo(p)
    rec["pages"]=int(info.get("Pages","0") or 0)
    rec["producer"]=info.get("Producer",""); rec["creator"]=info.get("Creator","")
    rec["created"]=info.get("CreationDate",""); rec["encrypted"]=info.get("Encrypted","")
    r=subprocess.run(["pdftotext","-layout","-enc","UTF-8",p,"-"],capture_output=True,timeout=600)
    txt=r.stdout.decode("utf-8","replace")
    pages=txt.split("\f")
    if pages and pages[-1].strip()=="": pages=pages[:-1]
    counts=[len(re.sub(r"\s","",pg)) for pg in pages]
    rec["chars"]=sum(counts)
    rec["image_pages"]=[i+1 for i,c in enumerate(counts) if c<40]
    if rec["pages"] and len(pages)<rec["pages"]:
        rec["image_pages"]+=list(range(len(pages)+1,rec["pages"]+1))
    rec["has_text"]=rec["chars"]>=40*max(1,rec["pages"])*0.2
    od=f"{W}/text/{proc_dir}"; os.makedirs(od,exist_ok=True)
    tp=f"{od}/{seq or '00000'}_{fid}.txt"
    with open(tp,"w",encoding="utf-8") as f: f.write("\f".join(pages))
    rec["text_path"]=os.path.relpath(tp,W)
    return rec
def main():
    done=set()
    if os.path.exists(MAN):
        for line in open(MAN,encoding="utf-8"):
            try: done.add(json.loads(line)["rel"])
            except Exception: pass
    files=[]
    for dp,_,fn in os.walk(RAW):
        for n in fn:
            if n.startswith("._"): continue
            p=os.path.join(dp,n)
            if os.path.relpath(p,RAW) not in done: files.append(p)
    files.sort(key=os.path.getsize)
    log(f"inicio: {len(files)} arquivos a processar ({len(done)} ja no manifesto)")
    n=0; t0=time.time()
    with ThreadPoolExecutor(max_workers=8) as ex, open(MAN,"a",encoding="utf-8") as out:
        futs={ex.submit(one,p):p for p in files}
        for fu in as_completed(futs):
            p=futs[fu]
            try:
                rec=fu.result(); out.write(json.dumps(rec,ensure_ascii=False)+"\n"); out.flush()
            except Exception as e:
                log(f"ERRO {os.path.relpath(p,RAW)}: {e!r}")
            n+=1
            if n%200==0: log(f"{n}/{len(files)} ({time.time()-t0:.0f}s)")
    log(f"fim: {n} processados em {time.time()-t0:.0f}s")
    open(f"{W}/manifest.done","w").write(time.strftime("%Y-%m-%dT%H:%M:%S"))
if __name__=="__main__": main()
