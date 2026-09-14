#!/usr/bin/env python3
"""Estágio 7: wiki de personagens a partir dos dados PÚBLICOS já sanitizados (docs/data/*.json).
Gera docs/data/wiki.json (consumido pelo site) e wiki/*.md (navegável no GitHub). Nunca lê o acervo bruto."""
import json, os, re, unicodedata, time
OUT=os.environ.get("BMDB_OUT","./autos-abertos/docs/data"); REPO=os.path.dirname(os.path.dirname(OUT)); WIKI=f"{REPO}/wiki"
os.makedirs(WIKI,exist_ok=True)
G=json.load(open(f"{OUT}/graph.json")); ENT=json.load(open(f"{OUT}/entities.json")); PROCS={p["processo"]:p for p in json.load(open(f"{OUT}/processos.json"))}; META=json.load(open(f"{OUT}/meta.json"))
TIPO={"Decisao monocratica":"Decisão monocrática","Peticao":"Petição","Peticao inicial":"Petição inicial","Busca e apreensao":"Busca e apreensão","Prisao preventiva":"Prisão preventiva","Inquerito":"Inquérito","Manifestacao":"Manifestação","Manifestacao da PGR":"Manifestação da PGR","Outras pecas":"Outras peças","Vista a PGR":"Vista à PGR","Restituicao de coisas apreendidas":"Restituição de coisas apreendidas","Certidao de julgamento":"Certidão de julgamento"}
byI={n["i"]:n for n in G["nodes"]}; byId={n["id"]:n for n in G["nodes"]}
adj={}
for e in G["edges"]:
    a,b=byI[e["s"]]["id"],byI[e["d"]]["id"]; adj.setdefault(a,[]).append((b,e["w"],e["p"])); adj.setdefault(b,[]).append((a,e["w"],e["p"]))
def slug(s): s=unicodedata.normalize("NFD",s); s="".join(c for c in s if unicodedata.category(c)!="Mn"); return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")
ROLE={"pessoa":"Pessoa","empresa":"Empresa","autoridade":"Autoridade","advogado":"Advogado"}
# critério de entrada na wiki: visível e com presença relevante
cands=[n for n in G["nodes"] if n["vis"] and (n["docs"]>=8 or n["procs"]>=4)]
cands.sort(key=lambda n:(-n["procs"],-n["docs"]))
pages=[]
for n in cands:
    e=ENT.get(n["id"],{"cit":[],"tl":{}})
    neigh=sorted(adj.get(n["id"],[]),key=lambda x:-x[1])
    byrole={}
    for m,w,p in neigh:
        mn=byId[m]
        if not mn["vis"]: continue
        byrole.setdefault(mn["papel"],[]).append({"id":m,"label":mn["label"],"w":w,"p":p,"slug":slug(mn["label"])})
    for r in byrole: byrole[r]=byrole[r][:10]
    tl=e.get("tl",{}); ks=sorted(tl); peak=max(tl.items(),key=lambda x:x[1])[0] if tl else None
    tipos={}
    for p,seq,t,pg,c in e.get("cit",[]): tipos[t]=tipos.get(t,0)+1
    tipos=sorted(tipos.items(),key=lambda x:-x[1])
    # texto-resumo factual, só a partir dos números (sem inferência)
    proc_txt=", ".join(f"{p} ({c})" for p,c in n["pe"][:5])
    resumo=(f"{n['label']} aparece em {n['docs']} peças narrativas de {n['procs']} dos 15 processos, com maior presença em {proc_txt}. "
            f"É classificado como {ROLE.get(n['papel'],n['papel'])} pelo pipeline. "
            + (f"As datas citadas nas páginas em que aparece concentram-se em {peak}. " if peak else "")
            + (f"Divide páginas com maior frequência com {byrole.get('pessoa',[{}])[0].get('label','')}" if byrole.get('pessoa') else "")
            + (f" e, entre empresas, com {byrole['empresa'][0]['label']}." if byrole.get('empresa') else "."))
    page={"id":n["id"],"slug":slug(n["label"]),"label":n["label"],"papel":n["papel"],"docs":n["docs"],"procs":n["procs"],"mentions":n["mentions"],"pe":n["pe"],"byrole":byrole,"tipos":tipos[:8],"cit":e.get("cit",[])[:15],"tl":tl,"peak":peak,"resumo":resumo,"c":n["c"]}
    pages.append(page)
json.dump({"gerado_em":META["gerado_em"],"pages":pages},open(f"{OUT}/wiki.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
# markdown
for f in os.listdir(WIKI):
    if f.endswith(".md"): os.remove(f"{WIKI}/{f}")
idx=["# Personagens\n",f"Fichas geradas automaticamente a partir dos dados públicos sanitizados ({META['gerado_em']}). Critério: presença em ao menos 8 peças narrativas ou 4 processos. Coocorrência na mesma página não prova relação.\n"]
for r,t in [("pessoa","Pessoas"),("empresa","Empresas"),("autoridade","Autoridades"),("advogado","Advogados")]:
    xs=[p for p in pages if p["papel"]==r]
    if not xs: continue
    idx.append(f"\n## {t}\n"); idx+= [f"- [{p['label']}]({p['slug']}.md) — {p['docs']} peças, {p['procs']} processos\n" for p in xs]
open(f"{WIKI}/README.md","w",encoding="utf-8").write("".join(idx))
for p in pages:
    md=[f"# {p['label']}\n",f"**{ROLE.get(p['papel'],p['papel'])}** · {p['docs']} peças narrativas · {p['procs']} processos · {p['mentions']} menções\n\n{p['resumo']}\n","\n## Presença por processo\n"]
    md+= [f"- {pr}: {c} peças\n" for pr,c in p["pe"]]
    for r,t in [("pessoa","Pessoas"),("empresa","Empresas"),("autoridade","Autoridades"),("advogado","Advogados")]:
        if p["byrole"].get(r): md.append(f"\n## Aparece junto de — {t}\n"); md+=[f"- [{x['label']}]({x['slug']}.md) — {x['w']} peças em comum, {x['p']} processos\n" for x in p["byrole"][r]]
    if p["tipos"]: md.append("\n## Tipos de peça em que aparece\n"); md+=[f"- {TIPO.get(t,t)}: {c}\n" for t,c in p["tipos"]]
    md.append("\n## Onde conferir\n| processo | seq | peça | página |\n|---|---|---|---|\n"); md+=[f"| {a} | {str(b).zfill(5)} | {TIPO.get(c,c)} | {d} |\n" for a,b,c,d,_ in p["cit"]]
    md.append("\n_“seq” é o número que inicia o nome do arquivo na pasta do processo dentro do pacote público do STF. Ficha automática; erros de identificação podem ser reportados por issue._\n")
    open(f"{WIKI}/{p['slug']}.md","w",encoding="utf-8").write("".join(md))
print(f"wiki: {len(pages)} fichas ->",WIKI)
