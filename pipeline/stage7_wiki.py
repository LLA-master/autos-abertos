#!/usr/bin/env python3
"""Estágio 7: fichas dos personagens a partir dos dados PÚBLICOS já sanitizados (docs/data/*.json)
e da curadoria em pipeline/personagens.py (quem é cada um, em que condição e em que processo aparece).

Gera docs/data/wiki.json (consumido pelo site) e wiki/*.md (navegável no GitHub). Nunca lê o acervo bruto.
O grafo completo (com arestas, para "aparece junto de") fica na pista local: BMDB_WORK/graph_full.json.

Entra na aba quem: (a) é visível e tem presença relevante (>= 8 peças narrativas ou >= 4 processos),
menos os servidores ancilares (docs/data/curadoria_autoridades_ancilares.txt) e as pessoas protegidas
(pipeline/protegidos.py); ou (b) tem entrada curada, mesmo abaixo do corte; ou (c) tem entrada curada
com sem_no=True, quando a extração automática não reconheceu o nome (ficha só de curadoria).

Além dos números, cada ficha ganha, quando curada: condição nos autos (cond), seção (grupo), uma linha
(sub), biografia (bio), âmbito por processo (amb) e fontes. Para todas, `atos` conta em quantos atos
do juízo publicados (docs/data/decisoes) o nome aparece, por processo, com a primeira página onde
conferir: é o dado que diz, sem curadoria, se um nome está nas decisões ou só nas petições."""
import json, os, re, sys, unicodedata, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from personagens import PERSONAGENS, COND, GRUPOS
from protegidos import PROTEGIDOS

OUT=os.environ.get("BMDB_OUT",os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"docs","data")); REPO=os.path.dirname(os.path.dirname(OUT)); WIKI=f"{REPO}/wiki"
os.makedirs(WIKI,exist_ok=True)
W=os.environ.get("BMDB_WORK","./work"); G=json.load(open(f"{W}/graph_full.json"))
ENT=json.load(open(f"{OUT}/entities.json")); META=json.load(open(f"{OUT}/meta.json"))
TIPO={"Sequestro":"Peça sobre bloqueio de bens (sequestro judicial)","Mandado":"Mandado judicial","Decisao monocratica":"Decisão monocrática","Peticao":"Petição","Peticao inicial":"Petição inicial","Busca e apreensao":"Peça sobre busca e apreensão","Prisao preventiva":"Peça sobre prisão preventiva","Inquerito":"Peça do inquérito","Manifestacao":"Manifestação","Manifestacao da PGR":"Manifestação da PGR","Outras pecas":"Outras peças","Vista a PGR":"Vista à PGR","Restituicao de coisas apreendidas":"Pedido de devolução de bens apreendidos","Certidao de julgamento":"Certidão de julgamento"}
ROLE={"pessoa":"Pessoa","empresa":"Empresa","autoridade":"Autoridade","advogado":"Advogado"}

def norm(s): s=unicodedata.normalize("NFD",(s or "").upper()); return "".join(c for c in s if unicodedata.category(c)!="Mn")
def slug(s): s=unicodedata.normalize("NFD",s); s="".join(c for c in s if unicodedata.category(c)!="Mn"); return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")

byI={n["i"]:n for n in G["nodes"]}; byId={n["id"]:n for n in G["nodes"]}
adj={}
for e in G["edges"]:
    a,b=byI[e["s"]]["id"],byI[e["d"]]["id"]; adj.setdefault(a,[]).append((b,e["w"],e["p"])); adj.setdefault(b,[]).append((a,e["w"],e["p"]))

# --- atos do juízo publicados que citam cada nome (dado público, verificável página a página)
DEC=[]
if os.path.exists(f"{OUT}/decisoes.json"):
    for m in json.load(open(f"{OUT}/decisoes.json",encoding="utf-8")):
        d=json.load(open(f"{OUT}/decisoes/{m['f']}.json",encoding="utf-8")); DEC.append((m["f"],d["proc"],[norm(p) for p in d["pags"]]))
def atos_de(label):
    key=norm(label); out={}
    for f,proc,pags in DEC:
        for i,pg in enumerate(pags,1):
            if key in pg:
                o=out.setdefault(proc,[0,f,i]); o[0]+=1; break
    return out   # {processo: [n atos, primeiro arquivo, primeira página]}

# --- quem entra
ANC=f"{OUT}/curadoria_autoridades_ancilares.txt"
ANCILARES=set(l.strip() for l in open(ANC,encoding="utf-8") if l.strip() and not l.startswith("#")) if os.path.exists(ANC) else set()
PROT={norm(k) for k in PROTEGIDOS}
ALIAS={k:v["alias_de"] for k,v in PERSONAGENS.items() if v.get("alias_de")}
CUR={k:v for k,v in PERSONAGENS.items() if not v.get("alias_de")}
cands=[n for n in G["nodes"] if n["vis"] and (n["docs"]>=8 or n["procs"]>=4) and n["id"] not in ANCILARES and norm(n["id"]) not in PROT and n["id"] not in ALIAS]
ids={n["id"] for n in cands}
for k,v in CUR.items():
    if v.get("sem_no"): continue
    if k not in byId or not byId[k]["vis"]: sys.exit(f"personagens.py: entrada sem nó visível na base: {k!r} (use sem_no=True se a extração não o reconheceu)")
    if k not in ids: cands.append(byId[k]); ids.add(k)
for k,v in ALIAS.items():
    if v not in CUR: sys.exit(f"personagens.py: alias_de aponta para entrada inexistente: {k!r} -> {v!r}")
cands.sort(key=lambda n:(-n["procs"],-n["docs"]))
GR={g:(c,t,te) for g,c,t,te in GRUPOS}

def ficha(n, cur):
    e=ENT.get(n["id"],{"cit":[],"tl":{}})
    neigh=sorted(adj.get(n["id"],[]),key=lambda x:-x[1])
    byrole={}
    for m,w,p in neigh:
        mn=byId[m]
        if not mn["vis"] or norm(m) in PROT: continue
        byrole.setdefault(mn["papel"],[]).append({"id":m,"label":mn["label"],"w":w,"p":p,"slug":slug(mn["label"])})
    for r in byrole: byrole[r]=byrole[r][:10]
    tl=e.get("tl",{}); peak=max(tl.items(),key=lambda x:x[1])[0] if tl else None
    tipos=collections.Counter(t for p,seq,t,pg,c in e.get("cit",[]))
    tipos=sorted(tipos.items(),key=lambda x:-x[1])
    proc_txt=", ".join(f"{p} ({c})" for p,c in n["pe"][:5])
    # o resumo automático só conta; ele não diz com quem o nome "divide páginas", porque isso é o que
    # mais sugere relação onde há só coocorrência (um banco oficiado ao lado do investigado que lá tem conta)
    resumo=(f"{n['label']} aparece em {n['docs']} peças narrativas de {n['procs']} dos 15 processos, com maior presença em {proc_txt}. "
            f"Classificação automática: {ROLE.get(n['papel'],n['papel'])}."
            + (f" As datas citadas nas páginas em que aparece concentram-se em {peak}." if peak else ""))
    cond=cur.get("cond") if cur else ("defesa" if n["papel"]=="advogado" else "nd")
    grupo=cur.get("grupo") if cur else ("defesa" if n["papel"]=="advogado" else "outros")
    aka=[byId[a]["label"] for a,t in ALIAS.items() if t==n["id"] and a in byId]
    page={"id":n["id"],"slug":slug(n["label"]),"label":n["label"],"papel":n["papel"],"docs":n["docs"],"procs":n["procs"],"mentions":n["mentions"],"pe":n["pe"],
          "byrole":byrole,"tipos":tipos[:8],"cit":e.get("cit",[])[:15],"tl":tl,"peak":peak,"resumo":resumo,"c":n.get("c",-1),
          "cond":cond,"grupo":grupo,"curado":bool(cur),"atos":atos_de(n["label"]),"aka":aka}
    if cur:
        for f in ("sub","sub_en","bio","bio_en","amb","amb_en","fontes"): page[f]=cur[f]
    return page

def ficha_sem_no(k, cur):
    return {"id":k,"slug":slug(cur["label"]),"label":cur["label"],"papel":cur["papel"],"docs":0,"procs":len(cur["amb"]),"mentions":0,"pe":[],
            "byrole":{},"tipos":[],"cit":[],"tl":{},"peak":None,"resumo":"","c":-1,"cond":cur["cond"],"grupo":cur["grupo"],"curado":True,"sem_no":True,
            "atos":atos_de(cur["label"]),"aka":[],**{f:cur[f] for f in ("sub","sub_en","bio","bio_en","amb","amb_en","fontes")}}

pages=[ficha(n,CUR.get(n["id"])) for n in cands]+[ficha_sem_no(k,v) for k,v in CUR.items() if v.get("sem_no")]
# ficha automática (sem curadoria) só para quem algum ato do juízo publicado nomeia; advogados ficam pelo papel.
# Nome recorrente só em petições e anexos continua na base (contagens), mas não ganha vitrine.
pages=[p for p in pages if p["curado"] or p["cond"]=="defesa" or p["atos"]]
# ordem: seções na ordem de GRUPOS; dentro, por processos e peças
order={g:i for i,(g,_,_,_) in enumerate(GRUPOS)}
pages.sort(key=lambda p:(order.get(p["grupo"],99),-p["procs"],-p["docs"],p["label"]))

# gate: nada de CPF/OAB/endereço no que sai daqui
blob=json.dumps(pages,ensure_ascii=False)
for pat,nm in [(r"\d{3}\.\d{3}\.\d{3}-\d{2}","CPF"),(r"\bOAB\b","OAB"),(r"\b\d{5}-\d{3}\b","CEP")]:
    if re.search(pat,blob): sys.exit(f"GATE FALHOU (wiki): {nm}")
for p in pages:
    if norm(p["label"]) in PROT or norm(p["id"]) in PROT: sys.exit(f"GATE FALHOU (wiki): pessoa protegida com ficha: {p['label']}")

meta={"cond":COND,"grupos":[{"g":g,"cond":c,"t":t,"t_en":te} for g,c,t,te in GRUPOS]}
json.dump({"gerado_em":META["gerado_em"],"meta":meta,"pages":pages},open(f"{OUT}/wiki.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))

# ---------------------------------------------------------------- markdown
for f in os.listdir(WIKI):
    if f.endswith(".md"): os.remove(f"{WIKI}/{f}")
idx=["# Personagens\n",f"Fichas geradas a partir dos dados públicos sanitizados ({META['gerado_em']}), com curadoria de condição, biografia e âmbito em `pipeline/personagens.py`. Critério automático de entrada: presença em ao menos 8 peças narrativas ou 4 processos; entradas curadas entram mesmo abaixo do corte. Coocorrência na mesma página não prova relação; investigado não é acusado; ninguém foi denunciado nos autos públicos.\n"]
for g,c,t,te in GRUPOS:
    xs=[p for p in pages if p["grupo"]==g]
    if not xs: continue
    idx.append(f"\n## {t}\n_{COND[c]['d']}_\n\n"); idx+= [f"- [{p['label']}]({p['slug']}.md) — {p.get('sub') or (str(p['docs'])+' peças, '+str(p['procs'])+' processos')}\n" for p in xs]
open(f"{WIKI}/README.md","w",encoding="utf-8").write("".join(idx))
for p in pages:
    c=COND[p["cond"]]
    md=[f"# {p['label']}\n",f"**{ROLE.get(p['papel'],p['papel'])}** · **{c['t']}** · seção: {GR[p['grupo']][1]}\n\n"]
    if p.get("sub"): md.append(f"_{p['sub']}_\n\n")
    if p.get("sem_no"): md.append("A extração automática não reconheceu este nome nas peças; a ficha é só de curadoria, sem contagens.\n\n")
    else: md.append(f"{p['docs']} peças narrativas · {p['procs']} processos · {p['mentions']} menções\n\n")
    if p.get("aka"): md.append("Também grafado nos autos como: "+", ".join(p["aka"])+".\n\n")
    md.append(f"> {c['d']}\n\n")
    if p.get("bio"):
        md.append("## Quem é nos autos\n"); md+=[x+"\n\n" for x in p["bio"]]
    if p.get("amb"):
        md.append("## Em que condição aparece, por processo\n"); md+=[f"- **{a}**: {b}\n" for a,b in p["amb"]]; md.append("\n")
    if p.get("fontes"): md.append(f"Fontes: {p['fontes']}\n\n")
    if p["atos"]:
        md.append("## Atos do juízo publicados que citam o nome\n"); md+=[f"- {pr}: {v[0]} ato(s); o primeiro, na peça {v[1].split('-')[1]} p. {v[2]}\n" for pr,v in sorted(p["atos"].items())]; md.append("\n")
    else: md.append("Nenhum ato do juízo publicado neste site cita o nome: as menções estão em petições, representações e anexos.\n\n")
    if p.get("resumo"): md.append("## Dados automáticos\n"+p["resumo"]+"\n\n## Presença por processo\n"); md+= [f"- {pr}: {n} peças\n" for pr,n in p["pe"]]
    if p["cond"]!="oficiada":
        for r,t in [("pessoa","Pessoas"),("empresa","Empresas"),("autoridade","Autoridades"),("advogado","Advogados")]:
            if p["byrole"].get(r): md.append(f"\n## Divide páginas com — {t} (coocorrência, não relação)\n"); md+=[f"- [{x['label']}]({x['slug']}.md) — {x['w']} peças em comum, {x['p']} processos\n" for x in p["byrole"][r]]
    if p["tipos"]: md.append("\n## Tipos de peça em que aparece\n"); md+=[f"- {TIPO.get(t,t)}: {n}\n" for t,n in p["tipos"]]
    if p["cit"]:
        md.append("\n## Onde conferir\nCada linha é uma peça dos autos em que o nome aparece, com a página. A coluna \"tipo da peça\" descreve o documento, não a pessoa ou empresa: um banco citado numa peça sobre bloqueio de bens é, em regra, o banco que recebeu a ordem, não o alvo dela. Só a leitura da página diz em que condição o nome aparece.\n\n| processo | seq | tipo da peça | página |\n|---|---|---|---|\n"); md+=[f"| {a} | {str(b).zfill(5)} | {TIPO.get(cc,cc)} | {d} |\n" for a,b,cc,d,_ in p["cit"]]
    md.append("\n_“seq” é o número que inicia o nome do arquivo na pasta do processo dentro do pacote público do STF. Erros de identificação ou de condição podem ser reportados por issue._\n")
    open(f"{WIKI}/{p['slug']}.md","w",encoding="utf-8").write("".join(md))
print(f"wiki: {len(pages)} fichas ({sum(1 for p in pages if p['curado'])} curadas, {sum(1 for p in pages if p.get('sem_no'))} só de curadoria) ->",WIKI)
print("por seção:",{t:sum(1 for p in pages if p['grupo']==g) for g,_,t,_ in GRUPOS})
