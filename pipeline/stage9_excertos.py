#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Estágio 9 — EXCERTOS. Traz para o site o texto dos atos do juízo, sem publicar o acervo.

Nenhum excerto é digitado à mão. `pipeline/excertos.py` aponta processo, seq, página e um
trecho-âncora; este estágio busca esse trecho no texto da própria peça (corpus/pages.parquet),
recorta o excerto a partir dele e grava docs/data/excertos.json. Se a âncora não existir na
página indicada, ou existir mais de uma vez, o build FALHA: é o que impede citação inventada,
trecho fora de contexto ou erro de transcrição.

Limites (não afrouxar sem decisão explícita):
- só peças assinadas por autoridade: decisões, despachos, acórdãos, certidões de julgamento e
  manifestações da Procuradoria-Geral da República. Representação policial, petição de defesa,
  resposta de banco e anexo de investigação ficam de fora — é onde está transcrição de conversa
  privada e dado de terceiro.
- no máximo 600 caracteres por excerto;
- o mesmo gate de padrões proibidos dos estágios 6 e 8 (CPF, inscrição profissional, endereço,
  CEP, nome de arquivo);
- toda entidade citada em `ents` tem de existir como nó visível do grafo.

Uso: BMDB_WORK=… BMDB_OUT=… python3 pipeline/stage9_excertos.py
"""
import os, re, sys, json
import duckdb

W = os.environ.get("BMDB_WORK", "./work") + "/corpus"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("BMDB_OUT", os.path.join(ROOT, "docs", "data"))
sys.path.insert(0, os.path.join(ROOT, "pipeline"))
from excertos import EXCERTOS

ATOS = ("Decisao monocratica", "Despacho", "Acordao", "Inteiro teor do acordao",
        "Inteiro teor do acordao (completo)", "Certidao de julgamento", "Manifestacao da PGR")
PGR_OK = ("Peticao", "Peticao inicial", "Manifestacao", "Vista a PGR")
MAX = 600
FORB = [(r"\d{3}\.\d{3}\.\d{3}-\d{2}", "CPF"), (r"\bOAB\b", "OAB"),
        (r"\bSHIS\b|\bSQS\b|\bSQN\b|\bRua\b|\bAvenida\b", "endereço"),
        (r"\.pdf\b", "nome de arquivo"), (r"\bCEP\b", "CEP")]

def limpa(t):
    """mesmo saneamento do extrator de leitura: tira carimbo de assinatura e aperta espaços"""
    t = re.sub(r"Documento assinado digitalmente.*?(?=\n|$)", "", t or "")
    t = re.sub(r"http://www\.stf\.jus\.br/portal/autenticacao\S*", "", t)
    t = re.sub(r"sob o código \S+ e senha \S+", "", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()

def corta(txt, e):
    """recorta do trecho-âncora até o fim pedido, sempre terminando em pontuação"""
    q = re.sub(r"\s+", " ", e["q"]).strip()
    n = txt.count(q)
    if n == 0: return None, f"âncora não encontrada na página: {q[:60]!r}"
    if n > 1: return None, f"âncora aparece {n}× na página (torne-a única): {q[:60]!r}"
    i = txt.index(q)
    if e.get("ate"):
        a = re.sub(r"\s+", " ", e["ate"]).strip()
        j = txt.find(a, i)
        if j < 0: return None, f"fim não encontrado depois da âncora: {a[:40]!r}"
        s = txt[i:j + len(a)]
    else:
        s = txt[i:i + int(e.get("n", 320))]
        m = re.search(r"[.;:!?](?=[^.]*$)", s)
        if m and m.end() > 60: s = s[:m.end()]
    s = re.sub(r"\s+\d+(?:\.\d+)*\.?\s*$", "", s.strip())  # tira a numeração do item seguinte
    s = s.strip()
    if s and s[0].islower(): s = "… " + s          # começou no meio da frase
    if s and s[-1] not in ".!?…\u201d\")": s = s + " …"   # terminou antes do ponto
    return s, None

def main():
    """sem argumentos: grava docs/data/excertos.json.
       --check ARQUIVO.json: só confere uma lista de excertos candidatos e imprime o resultado."""
    alvo = None
    if len(sys.argv) > 2 and sys.argv[1] == "--check":
        alvo = json.load(open(sys.argv[2], encoding="utf-8"))
    con = duckdb.connect()
    docs = {(r[0], int(r[1])): (r[2], r[3], r[4]) for r in con.execute(
        f"select processo, seq, id, tipo, pages from '{W}/docs.parquet' where ext='pdf' and seq is not null").fetchall()}
    rastro = json.load(open(os.path.join(OUT, "rastro.json"), encoding="utf-8"))
    ator = {(p, e["s"]): e.get("a") for p, v in rastro.items() for e in v}
    data = {(p, e["s"]): e.get("d") for p, v in rastro.items() for e in v}
    labels = {n["label"] for n in json.load(open(os.path.join(OUT, "nodes.json"), encoding="utf-8")) if n.get("vis")}

    erros, out = [], {}
    for e in (alvo if alvo is not None else EXCERTOS):
        key = (e["proc"], int(e["seq"]))
        if key not in docs: erros.append(f"{e['proc']} seq {e['seq']}: peça não existe no acervo"); continue
        doc_id, tipo, pags = docs[key]
        if not (tipo in ATOS or (tipo in PGR_OK and ator.get(key) == "pgr")):
            erros.append(f"{e['proc']} seq {e['seq']}: tipo '{tipo}' fora do que se pode citar"); continue
        if not (1 <= int(e["pag"]) <= int(pags)):
            erros.append(f"{e['proc']} seq {e['seq']}: página {e['pag']} não existe (peça tem {pags})"); continue
        row = con.execute(f"select text from '{W}/pages.parquet' where doc_id=? and page=?", [doc_id, int(e["pag"])]).fetchone()
        txt = limpa(row[0] if row else "")
        s, err = corta(txt, e)
        if err: erros.append(f"{e['proc']} seq {e['seq']} p.{e['pag']}: {err}"); continue
        if len(s) > MAX: erros.append(f"{e['proc']} seq {e['seq']}: excerto com {len(s)} caracteres (máximo {MAX})"); continue
        for pat, nm in FORB:
            if re.search(pat, s): erros.append(f"{e['proc']} seq {e['seq']}: excerto contém {nm}"); break
        else:
            desconhecidas = [x for x in e.get("ents", []) if x not in labels]
            if desconhecidas: erros.append(f"{e['proc']} seq {e['seq']}: entidade sem nó visível: {desconhecidas}"); continue
            out.setdefault(e["proc"], []).append({
                "s": int(e["seq"]), "p": int(e["pag"]), "t": e["t"], "c": e.get("ctx", ""),
                "x": s, "tipo": tipo, "d": data.get(key), "ents": e.get("ents", [])})
    if alvo is not None:
        for p in out:
            for x in sorted(out[p], key=lambda x: (x["s"], x["p"])):
                print(f"OK  {p} seq {x['s']} p.{x['p']} · {x['t']}\n    » {x['x']}\n")
        if erros: print("FALHAS:\n  " + "\n  ".join(erros)); sys.exit(1)
        print(f"{sum(len(v) for v in out.values())} excertos válidos"); return
    if erros:
        sys.exit("ESTÁGIO 9 FALHOU\n  " + "\n  ".join(erros))
    for p in out: out[p].sort(key=lambda x: ((x["d"] or ""), x["s"], x["p"]))
    js = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    bad = [(nm, len(re.findall(pat, js))) for pat, nm in FORB if re.findall(pat, js)]
    if bad: sys.exit(f"GATE FALHOU (excertos): {bad}")
    open(os.path.join(OUT, "excertos.json"), "w", encoding="utf-8").write(js)
    print(f"excertos.json: {sum(len(v) for v in out.values())} excertos em {len(out)} processos; {len(js)//1024} KB")

if __name__ == "__main__":
    main()
