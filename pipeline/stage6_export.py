#!/usr/bin/env python3
"""Estágio 6 (v0.2) — GATE DE SANITIZAÇÃO. Único ponto por onde dados saem da pista local para a pública.
Lê corpus/*.parquet e escreve docs/data/*.json no repo autos-abertos, mais gate_report.md (local).
Regras: empresa/autoridade/advogado visíveis; pessoa visível só se nomeada em decisão/despacho/petição inicial
ou recorrente (>=2 processos e >=3 peças); demais pessoas viram pseudônimo estável. Nenhum CPF, OAB, endereço,
nome de arquivo, subtipo ou texto integral sai. Falha se qualquer padrão de CPF aparecer na saída."""
import duckdb, json, re, os, hashlib, time, csv
import networkx as nx
W=os.environ.get("BMDB_WORK","./work"); OUT=os.environ.get("BMDB_OUT","./docs/data"); os.makedirs(OUT,exist_ok=True)
SALT2P=f"{W}/_logs/salt_pseudo"
if not os.path.exists(SALT2P): open(SALT2P,"w").write(hashlib.sha256(os.urandom(32)).hexdigest())
SALT2=open(SALT2P).read().strip()
PROCS=["INQ 5026","INQ 5035","RCL 88121","PET 15198","PET 15478","PET 15504","PET 15556","PET 15562","PET 15563","PET 15693","PET 15976","PET 15977","PET 15978","PET 16019","PET 16662"]
NARR=("Peticao","Peticao inicial","Decisao monocratica","Despacho","Manifestacao","Manifestacao da PGR","Prisao preventiva","Busca e apreensao","Inquerito","Sequestro","Outras pecas","Vista a PGR","Mandado","Restituicao de coisas apreendidas","Certidao de julgamento")
JUD=("Decisao monocratica","Despacho","Peticao inicial")
c=duckdb.connect()
for t in ["docs","pages","mentions","graph_nodes","graph_edges","graph_aliases"]: c.execute(f"CREATE VIEW {t} AS SELECT * FROM '{W}/corpus/{t}.parquet'")
c.execute(f"CREATE TABLE nodes AS SELECT * FROM graph_nodes WHERE docs>=2 AND NOT regexp_matches(entity,'\\b(SHIS|SQS|SQN|RUA|AVENIDA|AV|ALAMEDA|TRAVESSA|PRAÇA|RODOVIA|ESTRADA|QUADRA|LOTE|BLOCO|CONJUNTO|APTO|ANDAR|SALA|EDIFÍCIO|CONDOMÍNIO|BAIRRO|JARDIM|VILA|CEP)\\b')")
# mencoes canonicas em pecas narrativas
c.execute(f"""CREATE TABLE cm AS SELECT a.canon entity, m.doc_id, m.page, d.processo, d.seq, d.tipo
  FROM mentions m JOIN graph_aliases a ON a.value=regexp_replace(regexp_replace(upper(trim(regexp_replace(m.value,'\\s+(LTDA|EIRELI|ME|EPP|S\\.?A\\.?|S/A|DTVM|CCTVM|CIA|LTD|LLC|INC)\\.?$',''))),'^BCO ','BANCO '),'^NOVO BCO ','NOVO BANCO ')
  JOIN docs d ON d.id=m.doc_id WHERE m.kind='caps_name' AND d.tipo IN {NARR} AND a.canon IN (SELECT entity FROM nodes)""")
c.execute(f"CREATE TABLE injud AS SELECT DISTINCT entity FROM cm WHERE tipo IN {JUD}")
# overrides manuais de visibilidade
ov={}
vp=f"{W}/visibility_override.csv"
if os.path.exists(vp):
    for r in csv.DictReader(open(vp,encoding="utf-8")):
        if r.get("entity"): ov[r["entity"].strip()]=r["visible"].strip().lower() in ("1","true","sim","yes")
rows=c.sql("SELECT n.entity, n.papel, n.docs, n.procs, n.mentions, (j.entity IS NOT NULL) injud FROM nodes n LEFT JOIN injud j USING(entity)").fetchall()
def pseudo(e): return "Pessoa "+hashlib.sha256((SALT2+e).encode()).hexdigest()[:6].upper()
vis={}; label={}; reason={}
for e,papel,docs,procs,ment,injud in rows:
    if e in ov: v=ov[e]; why="override"
    elif papel in ("empresa","autoridade","advogado"): v=True; why=papel
    elif injud: v=True; why="nomeada em decisão/despacho/petição inicial"
    elif procs>=2 and docs>=3: v=True; why="recorrente (>=2 processos, >=3 peças)"
    else: v=False; why="pessoa incidental"
    vis[e]=v; reason[e]=why
    def nice(t):
        w=t.title().split(); return " ".join(x.lower() if i>0 and x.lower() in ("de","da","do","das","dos","e","di","del","von","van") else x for i,x in enumerate(w))
    label[e]=nice(e) if v else pseudo(e)
# processos por entidade
pe={e:[] for e in vis}
for e,p,n in c.sql("SELECT entity, processo, count(DISTINCT doc_id) FROM cm GROUP BY 1,2 ORDER BY 3 DESC").fetchall(): pe[e].append([p,n])
# grafo + layout + comunidades
G=nx.Graph()
for e,papel,docs,procs,ment,_ in rows: G.add_node(e,papel=papel,docs=docs,procs=procs,mentions=ment)
for s,d,docs,procs,pages in c.sql("SELECT src,dst,docs,procs,pages FROM graph_edges WHERE src IN (SELECT entity FROM nodes) AND dst IN (SELECT entity FROM nodes)").fetchall(): G.add_edge(s,d,w=int(docs),procs=int(procs))
G.remove_nodes_from([n for n in list(G) if G.degree(n)==0])
comms=nx.community.louvain_communities(G,weight="w",seed=42,resolution=1.0)
cid={}; 
for i,cset in enumerate(sorted(comms,key=len,reverse=True)):
    for n in cset: cid[n]=i
# --- métricas de rede (v0.2): pontes (betweenness, distância = 1/peso), influência (PageRank), agrupamento, parcela de ligações para fora do núcleo
for _u,_v,_d in G.edges(data=True): _d["dist"]=1.0/_d["w"]
BT=nx.betweenness_centrality(G,weight="dist",normalized=True); PR=nx.pagerank(G,weight="w"); CC=nx.clustering(G)
D_NARR=int(c.sql("SELECT count(DISTINCT doc_id) FROM cm").fetchone()[0])
def bridge(e):
    tot=sum(d["w"] for _,_,d in G.edges(e,data=True)) or 1
    return round(sum(d["w"] for _,v,d in G.edges(e,data=True) if cid.get(v,-1)!=cid.get(e,-1))/tot,2)
# tipos de peça por entidade (peças distintas) e quantas são atos judiciais (decisão, despacho, petição inicial)
tp={}
for e,t,n in c.sql("SELECT entity, tipo, count(DISTINCT doc_id) FROM cm GROUP BY 1,2").fetchall(): tp.setdefault(e,{})[t]=int(n)
jud={e:sum(n for t,n in d.items() if t in JUD) for e,d in tp.items()}
pos=nx.spring_layout(G,weight="w",k=0.9/ (len(G)**0.5) * 3,iterations=300,seed=42)
xs=[p[0] for p in pos.values()]; ys=[p[1] for p in pos.values()]
def sc(v,lo,hi): return round((v-lo)/(hi-lo+1e-9)*2000-1000,1)
nid={e:i for i,e in enumerate(G.nodes())}
nodes=[{"i":nid[e],"id":e if vis[e] else label[e],"label":label[e],"papel":G.nodes[e]["papel"],"docs":G.nodes[e]["docs"],"procs":G.nodes[e]["procs"],
        "mentions":G.nodes[e]["mentions"],"vis":vis[e],"c":cid.get(e,-1),"x":sc(pos[e][0],min(xs),max(xs)),"y":sc(pos[e][1],min(ys),max(ys)),
        "deg":G.degree(e),"wdeg":int(sum(d["w"] for _,_,d in G.edges(e,data=True))),"pe":pe[e][:15],
        "bt":round(BT[e]*1000,2),"pr":round(PR[e]*1000,3),"cc":round(CC[e],2),"br":bridge(e),"jud":jud.get(e,0)} for e in G.nodes()]
# l = especificidade (lift): peças em comum observadas / esperadas se os dois nomes fossem independentes
edges=[{"s":nid[s],"d":nid[d],"w":dd["w"],"p":dd["procs"],"l":round(min(999.0,dd["w"]*D_NARR/(G.nodes[s]["docs"]*G.nodes[d]["docs"])),1)} for s,d,dd in G.edges(data=True)]
# citações por entidade (peças narrativas), sem nome de arquivo/subtipo
cit={}
for e,p,seq,tipo,page,n in c.sql("""SELECT entity, processo, seq, tipo, min(page), count(*) FROM cm GROUP BY 1,2,3,4 QUALIFY row_number() OVER (PARTITION BY entity ORDER BY count(*) DESC, processo, seq)<=25""").fetchall():
    cit.setdefault(e,[]).append([p,int(seq),tipo,int(page),int(n)])
# datas por entidade (mesma página, peças narrativas) por mês
etl={}
for e,mo,n in c.sql("""SELECT cm.entity, left(m.value,7) mes, count(*) FROM cm JOIN mentions m ON m.doc_id=cm.doc_id AND m.page=cm.page AND m.kind='date'
  WHERE m.value BETWEEN '2015-01' AND '2026-12' GROUP BY 1,2""").fetchall(): etl.setdefault(e,{})[mo]=int(n)
entities={ (e if vis[e] else label[e]): {"label":label[e],"papel":G.nodes[e]["papel"],"vis":vis[e],"cit":cit.get(e,[]),"tl":etl.get(e,{}),"tp":tp.get(e,{})} for e in G.nodes()}
# processos
procs_out=[]
for p,pdfs,pages,tipos in c.sql("""SELECT processo, count(*), sum(pages), map_from_entries(list((tipo, n))) FROM (SELECT processo, tipo, count(*) n, sum(pages) pages, count(*) cnt FROM docs WHERE ext='pdf' GROUP BY 1,2) t GROUP BY 1""").fetchall():
    pass
tip=c.sql("SELECT processo, tipo, count(*) n, sum(pages) pg FROM docs WHERE ext='pdf' GROUP BY 1,2").fetchall()
agg={}
for p,t,n,pg in tip:
    a=agg.setdefault(p,{"processo":p,"pdfs":0,"pages":0,"tipos":{}}); a["pdfs"]+=n; a["pages"]+=int(pg or 0); a["tipos"][t]=n
top_by_proc={}
for p,e,n in c.sql("SELECT processo, entity, count(DISTINCT doc_id) n FROM cm GROUP BY 1,2 QUALIFY row_number() OVER (PARTITION BY processo ORDER BY n DESC)<=10").fetchall():
    if e in G: top_by_proc.setdefault(p,[]).append([label[e],G.nodes[e]["papel"],int(n)])
for p in PROCS:
    a=agg.get(p,{"processo":p,"pdfs":0,"pages":0,"tipos":{}}); a["top"]=top_by_proc.get(p,[]); procs_out.append(a)
# refs cruzadas entre os 15
xr=c.sql(f"""SELECT d.processo src, m.value dst, count(DISTINCT m.doc_id) docs FROM mentions m JOIN docs d ON d.id=m.doc_id
  WHERE m.kind='stf_ref' AND m.value IN {tuple(PROCS)} AND d.processo<>m.value GROUP BY 1,2""").fetchall()
# linha do tempo (peças narrativas)
tl=c.sql(f"""SELECT left(m.value,7) mes, d.processo, count(*) n FROM mentions m JOIN docs d ON d.id=m.doc_id WHERE m.kind='date' AND d.tipo IN {NARR}
  AND m.value BETWEEN '2015-01' AND '2026-12' GROUP BY 1,2""").fetchall()
tl_out={}
for mes,p,n in tl: tl_out.setdefault(mes,{})[p]=int(n)
# CNPJs com nome pelo contexto (registro público)
cn=c.sql("""WITH top AS (SELECT value cnpj, count(DISTINCT processo) procs, count(DISTINCT doc_id) docs FROM mentions WHERE kind='cnpj' GROUP BY 1 HAVING docs>=6),
ctx AS (SELECT t.cnpj,t.procs,t.docs, substr(p.text, greatest(1,m.pos-90), 90) antes FROM top t JOIN mentions m ON m.kind='cnpj' AND m.value=t.cnpj JOIN pages p ON p.doc_id=m.doc_id AND p.page=m.page),
nm AS (SELECT cnpj,procs,docs, trim(regexp_extract(antes,'([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ&.\\- ]{5,70})\\s*[,(–-]*\\s*(?:CNPJ|inscrit[ao]|C\\.?N\\.?P\\.?J\\.?)?[^A-Z]*$',1)) nome FROM ctx)
SELECT cnpj,procs,docs,nome,count(*) n FROM nm WHERE length(nome)>=8 AND NOT regexp_matches(nome,'CPF|CNPJ|SIGILO|POL[ÍI]CIA') GROUP BY 1,2,3,4 QUALIFY row_number() OVER (PARTITION BY cnpj ORDER BY count(*) DESC)=1 ORDER BY docs DESC LIMIT 60""").fetchall()
cnpjs=[{"cnpj":a,"procs":b,"docs":cc,"nome":d.title()} for a,b,cc,d,_ in cn]
tot=c.sql("SELECT count(*) pdfs, sum(pages) pg, sum(chars) ch FROM docs WHERE ext='pdf'").fetchone()
meta={"gerado_em":time.strftime("%Y-%m-%d %H:%M UTC",time.gmtime()),"fonte":{"nota":"https://noticias.stf.jus.br/postsnoticias/nota-a-imprensa-47/","pacote":"Pet16704.7z (Azure Blob do STF)","bytes":23826852064,"last_modified":"2026-09-11T21:33:57Z"},
      "corpus":{"pdfs":int(tot[0]),"paginas":int(tot[1]),"caracteres":int(tot[2]),"processos":PROCS},
      "grafo":{"nos":len(nodes),"arestas":len(edges),"visiveis":sum(1 for n in nodes if n["vis"]),"pseudonimizados":sum(1 for n in nodes if not n["vis"]),"comunidades":len(comms),"docs_narrativos":D_NARR},
      "sanitizacao":"empresas, autoridades e advogados nomeados; pessoas nomeadas apenas se citadas em decisão/despacho/petição inicial ou recorrentes em >=2 processos e >=3 peças; demais pseudonimizadas (código estável). Sem CPF, inscrição profissional, endereços, nomes de arquivo ou texto integral."}
def dump(name,obj): json.dump(obj,open(f"{OUT}/{name}","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
dump("graph.json",{"nodes":nodes,"edges":edges});
# natureza das ligações: peças (processo, seq, tipo, página) em que os dois nomes dividem página, por aresta exportada
c.execute("CREATE TABLE ex_edges (a VARCHAR, b VARCHAR, s INT, d INT)")
c.executemany("INSERT INTO ex_edges VALUES (?,?,?,?)",[(s_,d_,nid[s_],nid[d_]) for s_,d_,_ in G.edges(data=True)])
det={}
for s_,d_,tipo_,n_ in c.sql("""SELECT e.s, e.d, x.tipo, count(DISTINCT x.doc_id) FROM ex_edges e JOIN cm x ON x.entity=e.a JOIN cm y ON y.entity=e.b AND y.doc_id=x.doc_id AND y.page=x.page GROUP BY 1,2,3""").fetchall():
    det.setdefault(f"{s_}|{d_}",{"tipos":{},"cit":[]})["tipos"][tipo_]=int(n_)
for s_,d_,p_,seq_,tipo_,pg_,n_ in c.sql("""SELECT s,d,processo,seq,tipo,page,n FROM (SELECT e.s, e.d, x.processo, x.seq, x.tipo, min(x.page) page, count(*) n, row_number() OVER (PARTITION BY e.s,e.d ORDER BY count(*) DESC, x.processo, x.seq) rn FROM ex_edges e JOIN cm x ON x.entity=e.a JOIN cm y ON y.entity=e.b AND y.doc_id=x.doc_id AND y.page=x.page GROUP BY e.s,e.d,x.processo,x.seq,x.tipo) WHERE rn<=8""").fetchall():
    det.setdefault(f"{s_}|{d_}",{"tipos":{},"cit":[]})["cit"].append([p_,int(seq_),tipo_,int(pg_),int(n_)])
dump("edges_detail.json",det)
# período das ligações: datas citadas nas páginas em que os dois nomes aparecem, por trimestre (para o filtro temporal do grafo)
c.execute("CREATE TABLE cmp AS SELECT DISTINCT entity, doc_id, page FROM cm")
etq={}
for s_,d_,q_,n_ in c.sql("""SELECT e.s, e.d, substr(m.value,1,4)||'T'||cast((cast(substr(m.value,6,2) AS INT)+2)//3 AS VARCHAR) q, count(*) n
  FROM ex_edges e JOIN cmp x ON x.entity=e.a JOIN cmp y ON y.entity=e.b AND y.doc_id=x.doc_id AND y.page=x.page
  JOIN mentions m ON m.doc_id=x.doc_id AND m.page=x.page AND m.kind='date' AND m.value BETWEEN '2015-01' AND '2026-12' GROUP BY 1,2,3""").fetchall(): etq.setdefault(f"{s_}|{d_}",{})[q_]=int(n_)
dump("edges_tl.json",etq)
# primeiro e último mês com datas citadas junto ao nome (>=2 ocorrências; senão qualquer)
for n_,e in zip(nodes,G.nodes()):
    ms=sorted(k for k,v in etl.get(e,{}).items() if v>=2) or sorted(etl.get(e,{}))
    n_["m0"]=ms[0] if ms else None; n_["m1"]=ms[-1] if ms else None
dump("graph.json",{"nodes":nodes,"edges":edges}); dump("entities.json",entities); dump("processos.json",procs_out)
dump("crossrefs.json",[{"s":a,"d":b,"n":int(n)} for a,b,n in xr]); dump("timeline.json",tl_out); dump("cnpjs.json",cnpjs); dump("meta.json",meta)
# GATE: varredura de padrões proibidos na saída
bad=[]
for f in [f for f in os.listdir(OUT) if not f.startswith("._")]:
    s=open(f"{OUT}/{f}",encoding="utf-8").read()
    for pat,nm_ in [(r"\d{3}\.\d{3}\.\d{3}-\d{2}","CPF"),(r"\bOAB\b","OAB"),(r"\bSHIS\b|\bSQS\b|\bSQN\b|\bRua\b|\bAvenida\b","endereço"),(r"\.pdf\b","nome de arquivo"),(r"\bCEP\b","CEP")]:
        if re.search(pat,s): bad.append((f,nm_))
rep=[f"# Gate de sanitização — {meta['gerado_em']}\n",f"nós exportados: {len(nodes)} (visíveis {meta['grafo']['visiveis']}, pseudonimizados {meta['grafo']['pseudonimizados']}); arestas: {len(edges)}; comunidades: {len(comms)}\n","\n## Motivos de visibilidade\n"]
from collections import Counter
for k,v in Counter(reason[e] for e in G.nodes()).most_common(): rep.append(f"- {k}: {v}\n")
rep.append("\n## Padrões proibidos na saída\n"+("NENHUM\n" if not bad else "".join(f"- {f}: {n}\n" for f,n in bad)))
open(f"{W}/gate_report.md","w").write("".join(rep))
with open(f"{W}/gate_review_pseudonimizados.csv","w",encoding="utf-8",newline="") as f:
    wr=csv.writer(f); wr.writerow(["entity","pseudonimo","papel","docs","procs","motivo"])
    for e in sorted(G.nodes(), key=lambda e:-G.nodes[e]["docs"]):
        if not vis[e]: wr.writerow([e,label[e],G.nodes[e]["papel"],G.nodes[e]["docs"],G.nodes[e]["procs"],reason[e]])
print("".join(rep))
if bad: raise SystemExit("GATE FALHOU: padrões proibidos na saída — nada deve ser publicado")
print("tamanhos:",{f:os.path.getsize(f"{OUT}/{f}")//1024 for f in os.listdir(OUT) if not f.startswith("._")},"KB")
