#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Estágio 8 — RASTRO DOCUMENTAL em linguagem natural (dados para a página "Processos").

Lê corpus/docs.parquet e corpus/pages.parquet e escreve docs/data/rastro.json:
  { "PET 15563": [ {"s":seq, "t":tipo, "st":rótulo sanitizado ou null, "p":páginas, "d":"AAAA-MM-DD" ou null, "a":ator}, ... ] }

Só entram peças de tipo narrativo/processual (nunca anexos, procurações, recibos, identificação, mídias).
O rótulo (subtipo) só sai quando é institucional (ofício, banco, órgão, tipo de decisão); números de protocolo
são removidos; nada que pareça nome de pessoa sai. A data vem do texto da própria peça (assinatura, cabeçalho)
e, na falta, da data de criação do PDF registrada pelo STF. O ator é inferido do texto da primeira página.
Passa pelo mesmo gate de padrões proibidos do estágio 6 e falha se algo escapar.

Uso: BMDB_WORK=/caminho/work BMDB_OUT=/caminho/docs/data python3 pipeline/stage8_rastro.py
"""
import os, re, json, sys, collections, datetime
import duckdb
W=os.environ.get("BMDB_WORK","./work")+"/corpus"
OUT=os.environ.get("BMDB_OUT",os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"docs","data"))
EXC=('Documentos comprobatorios','Documento comprobatorio','Documentos de identificacao','Recibo de peticao eletronica',
     'Procuracao','Substabelecimento','Video Probatorio','Malote Digital','Aviso de recebimento','')
MESES={m:i+1 for i,m in enumerate("janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split())}
INST=re.compile(r"\b(Oficio|Ofício|Informacoes|Informações|Banco|S\.? ?A\.?|Ltda|LTDA|CVM|ANAC|SUSEP|B3|Caixa|CAIXA|BRB|Sicredi|Sicoob|SICOOB|Cooperativa|Comprovante|Determinacao|Comunica\w*|Mandado|Certidao|CERTIDAO|Decisao|Despacho|Termo|Guia|Cumprimento|Resposta|Interlocutoria|Liminar|Final|Retificacao|Pet ?\d+|INQ|SL \d+|Vara|TRF|Policia Federal|Polícia Federal|MJSP|Senado|CPMI|Controladoria|Corretora|Distribuidora|Pagamentos?|Nubank|Itau|Bradesco|Santander|Safra|Rabobank|Stone|Foxbit|Binance|Coinbase|PicPay|Ademicon|Telefonica|Complexo Penitenciario|Gerencia|Autuacao|Intimacao|Lista de remessa|Entrega|Autos disponibilizados|ausencia de manifestacao|Documentos comprobatorios|PecaJuntada|Cumprido|SEM CUMPRIMENTO|Busca e Apreensao|Prisao|Sequestro|Restituicao|Acordao|Inteiro teor|Ministerio|Receita|COAF|Agencia|Instituicao|Credito|Capital|Unidade|Servico|Secao|Diretor)\b",re.I)
PESSOA=re.compile(r"\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}")
FORB=[(r"\d{3}\.\d{3}\.\d{3}-\d{2}","CPF"),(r"\bOAB\b","OAB"),(r"\bSHIS\b|\bSQS\b|\bSQN\b|\bRua\b|\bAvenida\b","endereço"),(r"\.pdf\b","nome de arquivo"),(r"\bCEP\b","CEP")]

def rotulo(tipo,sub):
    if not sub or sub==tipo: return None
    s=re.sub(r"(?<!Pet )(?<!PET )(?<!SL )(?<!INQ )(?<!Inq )\b\d{5,}\b","",sub)                 # protocolos, números de ofício/mandado
    s=re.sub(r"\b(n[.º°]?|nº|numero)\s*$","",s,flags=re.I)
    s=re.sub(r"[_]+"," ",s); s=re.sub(r"\s+\.\s*"," ",s); s=re.sub(r"\bn\.\s*(?=[-–]|$)","",s); s=re.sub(r"\s{2,}"," ",s).strip(" -–.:")
    if len(s)>90: s=s[:90].rsplit(" ",1)[0]+"…"
    if len(s)<3: return None
    if PESSOA.search(s) and not INST.search(s): return None
    if not INST.search(s): return None
    if any(re.search(p,s) for p,_ in FORB): return None
    return s[:90]

MIN=datetime.date(2025,6,1); MAX=datetime.date(2026,9,11)  # nada no acervo é posterior à publicação pelo STF em 11.09.2026

def datas(txt):
    """candidatas em ordem de preferência: extenso → carimbo 'Dados: AAAA.MM.DD' → 'em dd/mm/aaaa hh:mm' → dd/mm/aaaa"""
    out=[]
    for m in re.finditer(r"(\d{1,2})[ºo°]?\s+de\s+([a-zç]+)\s+de\s+(\d{4})",txt,flags=re.I):
        mes=MESES.get(m.group(2).lower())
        if mes: out.append((int(m.group(3)),mes,int(m.group(1)),3))
    for m in re.finditer(r"Dados:\s*(\d{4})\.(\d{2})\.(\d{2})",txt): out.append((int(m.group(1)),int(m.group(2)),int(m.group(3)),2))
    for m in re.finditer(r"\bem\s+(\d{2})/(\d{2})/(\d{4})\s+\d{2}:\d{2}",txt): out.append((int(m.group(3)),int(m.group(2)),int(m.group(1)),2))
    for m in re.finditer(r"\b(\d{2})/(\d{2})/(\d{4})\b",txt): out.append((int(m.group(3)),int(m.group(2)),int(m.group(1)),1))
    ok=[]
    for y,mo,d,w in out:
        try: dt=datetime.date(y,mo,d)
        except ValueError: continue
        if MIN<=dt<=MAX: ok.append((w,dt))
    return ok

def escolhe(first,last,created):
    # a data de assinatura está no fim da peça: candidatas da última página valem mais
    c=[(w+1,d) for w,d in datas(last or "")]+datas(first or "")
    if c:
        w=max(x[0] for x in c); best=[x[1] for x in c if x[0]==w]
        # entre as de maior peso, a mais recente: uma peça não cita o futuro, e a data de assinatura é a última
        return max(best).isoformat()
    if created:
        m=re.search(r"([A-Z][a-z]{2})\s+(\d{1,2})\s+\d{2}:\d{2}:\d{2}\s+(\d{4})",created)
        if m:
            mm={"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,"Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}.get(m.group(1))
            if mm:
                try:
                    dt=datetime.date(int(m.group(3)),mm,int(m.group(2)))
                    if MIN<=dt<=MAX: return dt.isoformat()
                except ValueError: pass
    return None

def ator(tipo,first,st=None):
    t=(first or "")[:1500].upper()
    if tipo in ("Despacho","Decisao monocratica","Decisao","Acordao","Inteiro teor do acordao","Inteiro teor do acordao (completo)","Vista a PGR","Certidao","Certidao de julgamento","Certidao de retificacao de autuacao","Certidao de transito em julgado","Certidao de Intimacao","Termo de disponibilizacao de autos","Intimacao","Mandado de intimacao","Mandado","Comunicacao assinada"): return "stf"
    if "PROCURADOR-GERAL DA REPÚBLICA" in t or "PROCURADORIA-GERAL DA REPÚBLICA" in t or "MINISTÉRIO PÚBLICO FEDERAL" in t or "PROCURADOR-GERAL DA REPUBLICA" in t: return "pgr"
    if "POLÍCIA FEDERAL" in t or "POLICIA FEDERAL" in t or "DELEGADO DE POLÍCIA" in t or "MJSP" in t: return "pf"
    if "BANCO CENTRAL DO BRASIL" in t or "BCB" in t: return "bcb"
    if re.search(r"RESPOSTA (AO )?OF.{0,2}CIO|OF.{0,2}CIO ELETR.{0,2}NICO|EM ATEN.{0,2}O AO OF.{0,2}CIO|EM CUMPRIMENTO|EM ATENDIMENTO",t): return "resp"
    if "OAB" in t: return "def"
    if st and re.search(r"Informacoes|Banco|S\.? ?A\b|Ltda|Corretora|Distribuidora|Cooperativa|Pagamento|Instituicao|Oficio|Agencia|Ministerio|Receita|COAF|Controladoria|Vara|TRF|Senado|CPMI|Complexo",st,re.I): return "resp"
    return None

con=duckdb.connect()
docs=con.execute(f"select id,processo,seq,tipo,subtipo,pages,created from '{W}/docs.parquet' where ext='pdf' and tipo not in {EXC} order by processo,seq").fetchall()
ids=[d[0] for d in docs]
pg=con.execute(f"select doc_id,page,text from '{W}/pages.parquet' where doc_id in (select id from '{W}/docs.parquet' where ext='pdf' and tipo not in {EXC}) and (page=1 or page=(select max(page) from '{W}/pages.parquet' p2 where p2.doc_id=pages.doc_id))").fetchall() if False else None
# duas consultas simples (a correlacionada acima é lenta no DuckDB com parquet): primeira e última página
first={r[0]:r[1] for r in con.execute(f"select doc_id,text from '{W}/pages.parquet' where page=1").fetchall()}
lastp={r[0]:r[1] for r in con.execute(f"select p.doc_id,p.text from '{W}/pages.parquet' p join (select doc_id,max(page) mp from '{W}/pages.parquet' group by 1) m on m.doc_id=p.doc_id and m.mp=p.page").fetchall()}
out=collections.defaultdict(list); sem_data=0
for id_,proc,seq,tipo,sub,pages,created in docs:
    d=escolhe(first.get(id_),lastp.get(id_),created)
    if not d: sem_data+=1
    out[proc].append({"s":int(seq),"t":tipo,"st":rotulo(tipo,sub),"p":int(pages),"d":d,"a":ator(tipo,first.get(id_),rotulo(tipo,sub))})
# resumos em linguagem natural (texto autoral, em pipeline/resumos.py)
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from resumos import RESUMOS
faltam=[p for p in out if p not in RESUMOS]
if faltam: sys.exit(f"resumos.py não cobre: {faltam}")
js=json.dumps(out,ensure_ascii=False,separators=(",",":"))
bad=[(nm,len(re.findall(p,js))) for p,nm in FORB if re.findall(p,js)]
if bad: sys.exit(f"GATE FALHOU (rastro): {bad}")
os.makedirs(OUT,exist_ok=True)
open(os.path.join(OUT,"rastro.json"),"w",encoding="utf-8").write(js)
rj=json.dumps({k:{"t":v["t"],"o":v["o"],"r":v["r"],"m":[list(x) for x in v["m"]],"s":v["s"]} for k,v in RESUMOS.items()},ensure_ascii=False,separators=(",",":"))
badr=[(nm,len(re.findall(pt,rj))) for pt,nm in FORB if re.findall(pt,rj)]
if badr: sys.exit(f"GATE FALHOU (resumos): {badr}")
open(os.path.join(OUT,"resumos.json"),"w",encoding="utf-8").write(rj)
print("resumos.json:",len(RESUMOS),"processos")
print("rastro.json:",sum(len(v) for v in out.values()),"peças em",len(out),"processos;",sem_data,"sem data;",len(js)//1024,"KB")
