#!/usr/bin/env python3
"""Estágio 4: extração estruturada por regex sobre corpus/pages.parquet -> corpus/mentions.parquet
kinds: cnj, cnpj, cpf(hash), oab, money, date, stf_ref, caps_name"""
import re, time, hashlib, os
import pyarrow.parquet as pq, pyarrow as pa
from concurrent.futures import ProcessPoolExecutor
import os
W=os.environ.get("BMDB_WORK","./work"); LOG=f"{W}/_logs/stage4.log"
SALT=open(f"{W}/_logs/salt").read().strip()
MESES={m:i+1 for i,m in enumerate("janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split())}
P={
 "cnj":re.compile(r"\b(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})\b"),
 "cnpj":re.compile(r"\b(\d{2})\.?(\d{3})\.?(\d{3})/?(\d{4})-?(\d{2})\b"),
 "cpf":re.compile(r"\b(\d{3})\.(\d{3})\.(\d{3})-(\d{2})\b"),
 "oab":re.compile(r"\bOAB[\s/.:-]*(?:n[º°.]?\s*)?([A-Z]{2})?[\s/.:-]*(?:n[º°.]?\s*)?(\d{1,3}(?:\.\d{3})?|\d{3,6})\b"),
 "money":re.compile(r"R\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{2}))?"),
 "date_ext":re.compile(r"\b(\d{1,2})[º°]?\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b",re.I),
 "date_num":re.compile(r"\b(\d{2})/(\d{2})/(\d{4})\b"),
 "stf_ref":re.compile(r"\b(Pet|PET|Inq|INQ|Rcl|RCL|HC|AP|ADPF|MS|Ap|Pet\.)\s?\.?\s?(?:n[º°.]?\s?)?(\d{1,3}(?:\.\d{3})+|\d{3,6})\b"),
 "caps_name":re.compile(r"\b([A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'’.-]{1,}(?:\s+(?:DE|DA|DO|DAS|DOS|DI|DEL|VAN|VON|de|da|do|das|dos)\s+|\s+)[A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'’.-]{1,}(?:(?:\s+(?:DE|DA|DO|DAS|DOS|DI|DEL|de|da|do|das|dos)\s+|\s+)[A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'’.-]{1,}){0,5})\b"),
}
def work(batch):
    out=[]
    for r in batch:
        t=r["text"]
        if not t: continue
        base=(r["doc_id"],r["processo"],r["page"])
        for m in P["cnj"].finditer(t):
            g=m.groups(); out.append(base+("cnj",f"{g[0]}-{g[1]}.{g[2]}.{g[3]}.{g[4]}.{g[5]}",m.start()))
        for m in P["cnpj"].finditer(t):
            g=m.groups(); out.append(base+("cnpj",f"{g[0]}.{g[1]}.{g[2]}/{g[3]}-{g[4]}",m.start()))
        for m in P["cpf"].finditer(t):
            v="".join(m.groups()); out.append(base+("cpf",hashlib.sha256((SALT+v).encode()).hexdigest()[:16],m.start()))
        for m in P["oab"].finditer(t):
            uf,num=m.group(1) or "",m.group(2).replace(".",""); out.append(base+("oab",f"{uf} {num}".strip(),m.start()))
        for m in P["money"].finditer(t):
            v=m.group(1).replace(".","")+"."+(m.group(2) or "00"); out.append(base+("money",v,m.start()))
        for m in P["date_ext"].finditer(t):
            out.append(base+("date",f"{m.group(3)}-{MESES[m.group(2).lower()]:02d}-{int(m.group(1)):02d}",m.start()))
        for m in P["date_num"].finditer(t):
            d,mo,y=int(m.group(1)),int(m.group(2)),int(m.group(3))
            if 1<=d<=31 and 1<=mo<=12 and 1900<=y<=2030: out.append(base+("date",f"{y}-{mo:02d}-{d:02d}",m.start()))
        for m in P["stf_ref"].finditer(t):
            out.append(base+("stf_ref",f"{m.group(1).upper().rstrip('.')} {m.group(2).replace('.','')}",m.start()))
        for m in P["caps_name"].finditer(t):
            v=re.sub(r"\s+"," ",m.group(1)).strip(" .-")
            if 6<=len(v)<=70 and not re.search(r"\d",v): out.append(base+("caps_name",v,m.start()))
    return out
def main():
    t0=time.time(); tbl=pq.read_table(f"{W}/corpus/pages.parquet",columns=["doc_id","processo","page","text"])
    rows=tbl.to_pylist(); n=len(rows); CH=2000
    batches=[rows[i:i+CH] for i in range(0,n,CH)]
    res=[]
    with ProcessPoolExecutor(max_workers=8) as ex:
        for i,part in enumerate(ex.map(work,batches)):
            res.extend(part)
            if i%10==0:
                with open(LOG,"a") as f: f.write(f"{time.strftime('%H:%M:%S')} lote {i}/{len(batches)} mencoes={len(res)}\n")
    cols=list(zip(*res)) if res else [[]]*6
    out=pa.table({"doc_id":cols[0],"processo":cols[1],"page":cols[2],"kind":cols[3],"value":cols[4],"pos":cols[5]})
    pq.write_table(out,f"{W}/corpus/mentions.parquet",compression="zstd")
    with open(LOG,"a") as f: f.write(f"{time.strftime('%H:%M:%S')} fim: {len(res)} mencoes de {n} paginas em {time.time()-t0:.0f}s\n")
    open(f"{W}/corpus/mentions.done","w").write("ok")
if __name__=="__main__": main()
