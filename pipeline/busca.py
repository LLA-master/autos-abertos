#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Busca no acervo — índice local, nunca publicado.

O acervo tem 189 mil páginas e 354 milhões de caracteres. Ler peça inteira para achar
uma frase é caro e lento. Este índice responde "onde os autos falam disso" em segundos,
devolvendo processo, peça, página e o trecho ao redor da ocorrência.

O índice fica em $BMDB_WORK/busca.duckdb, que é área local e está no .gitignore: ele contém
o texto integral do acervo e NÃO pode ir para o repositório nem para o site. O que sai daqui
para o público continua passando pelos estágios 6, 8 e 9.

  python3 pipeline/busca.py --indexar                   monta ou refaz o índice (uma vez)
  python3 pipeline/busca.py "prisão preventiva"         busca em tudo
  python3 pipeline/busca.py "conta espelho" -n 5        cinco melhores
  python3 pipeline/busca.py "sigilo" --proc "PET 15693" num processo
  python3 pipeline/busca.py "propina" --atos            só decisões, despachos e acórdãos
  python3 pipeline/busca.py "TITAN CAYMAN" --narrativas só peças narrativas
  python3 pipeline/busca.py --pagina "PET 15563" 17 3   imprime uma página inteira

A busca é lexical (BM25, extensão FTS do DuckDB): acha as palavras que você escrever, com
radical (stemmer em português) e sem acento. Não acha sinônimo nem paráfrase; para isso
seria preciso uma camada de embeddings, que é outro custo e outra decisão.
"""
import os, re, sys, argparse, textwrap
import duckdb

W = os.environ.get("BMDB_WORK", "./work")
CORPUS = W + "/corpus"
DB = W + "/busca.duckdb"
ATOS = ("Decisao monocratica", "Despacho", "Acordao", "Inteiro teor do acordao",
        "Inteiro teor do acordao (completo)", "Certidao de julgamento", "Manifestacao da PGR")
NARR = ATOS + ("Peticao inicial", "Peticao", "Busca e apreensao", "Prisao preventiva",
               "Sequestro", "Manifestacao", "Informacao", "Inquerito")

def limpa(t):
    t = re.sub(r"Documento assinado digitalmente.*?(?=\n|$)", "", t or "")
    t = re.sub(r"http\S+autenticarDocumento\S*", "", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()

def indexar():
    if os.path.exists(DB): os.remove(DB)
    con = duckdb.connect(DB)
    con.execute("INSTALL fts; LOAD fts;")
    con.execute(f"""CREATE TABLE pag AS
        SELECT p.doc_id || '#' || p.page AS id, p.doc_id AS doc_id, d.processo AS processo, CAST(d.seq AS INTEGER) AS seq,
               d.tipo AS tipo, COALESCE(d.subtipo,'') AS subtipo, p.page AS pag,
               regexp_replace(p.text, '\\s+', ' ', 'g') AS texto
        FROM '{CORPUS}/pages.parquet' p
        JOIN '{CORPUS}/docs.parquet' d ON d.id = p.doc_id
        WHERE d.ext='pdf' AND d.seq IS NOT NULL AND length(p.text) > 40""")
    n = con.execute("SELECT count(*), sum(length(texto)) FROM pag").fetchone()
    con.execute("CREATE UNIQUE INDEX pag_pk ON pag(id)")
    con.execute("PRAGMA create_fts_index('pag', 'id', 'texto', stemmer='portuguese', stopwords='none', overwrite=1)")
    con.close()
    print(f"índice: {n[0]:,} páginas, {n[1]/1e6:.0f} M caracteres → {DB} ({os.path.getsize(DB)/1e6:.0f} MB)")

def trecho(texto, termos, volta=260):
    """devolve o pedaço da página ao redor da primeira ocorrência de um dos termos"""
    alvo = None
    for t in sorted(termos, key=len, reverse=True):
        m = re.search(re.escape(t), texto, re.I)
        if m: alvo = m.start(); break
    if alvo is None: return textwrap.shorten(texto, volta * 2, placeholder=" …")
    i = max(0, alvo - volta // 2)
    s = texto[i:i + volta * 2]
    return ("… " if i else "") + s.strip() + (" …" if i + volta * 2 < len(texto) else "")

def buscar(q, n, proc, tipos, inteiro):
    if not os.path.exists(DB): sys.exit("índice não existe. Rode: python3 pipeline/busca.py --indexar")
    con = duckdb.connect(DB, read_only=True)
    con.execute("LOAD fts;")
    filtro, args = "", [q]
    if proc: filtro += " AND processo = ?"; args.append(proc)
    if tipos: filtro += f" AND tipo IN {tuple(tipos)}"
    rows = con.execute(f"""
        WITH s AS (SELECT *, fts_main_pag.match_bm25(id, ?, fields:='texto') AS nota FROM pag)
        SELECT processo, seq, tipo, subtipo, pag, nota, texto FROM s
        WHERE nota IS NOT NULL {filtro} ORDER BY nota DESC LIMIT {int(n)}""", args).fetchall()
    if not rows: print("nada encontrado."); return
    termos = [t for t in re.findall(r'"([^"]+)"|(\w{3,})', q) for t in t if t]
    for processo, seq, tipo, subtipo, pag, nota, texto in rows:
        cab = f"{processo} · seq {str(seq).zfill(5)} · p. {pag} · {tipo}" + (f" ({subtipo[:40]})" if subtipo and subtipo != tipo else "")
        print(f"\n\033[1m{cab}\033[0m  [{nota:.1f}]")
        print(limpa(texto) if inteiro else trecho(limpa(texto), termos))

def pagina(proc, seq, pags):
    con = duckdb.connect(DB, read_only=True) if os.path.exists(DB) else duckdb.connect()
    fonte = "pag" if os.path.exists(DB) else f"(SELECT d.processo, CAST(d.seq AS INTEGER) seq, p.page pag, p.text texto FROM '{CORPUS}/pages.parquet' p JOIN '{CORPUS}/docs.parquet' d ON d.id=p.doc_id)"
    a, b = (pags.split("-") + [None])[:2] if "-" in pags else (pags, pags)
    rows = con.execute(f"SELECT pag, texto FROM {fonte} WHERE processo=? AND seq=? AND pag BETWEEN ? AND ? ORDER BY pag",
                       [proc, int(seq), int(a), int(b)]).fetchall()
    for p, t in rows:
        print(f"\n===== {proc} seq {seq} página {p} =====")
        print(limpa(t))

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="busca no acervo local (índice não publicado)")
    ap.add_argument("termo", nargs="*", help="palavras a procurar; use aspas para expressão exata")
    ap.add_argument("--indexar", action="store_true")
    ap.add_argument("-n", type=int, default=8)
    ap.add_argument("--proc", default=None)
    ap.add_argument("--atos", action="store_true", help="só decisões, despachos, acórdãos e manifestações da PGR")
    ap.add_argument("--narrativas", action="store_true", help="peças narrativas (exclui anexos, extratos e mídias)")
    ap.add_argument("--inteiro", action="store_true", help="imprime a página inteira, não só o trecho")
    ap.add_argument("--pagina", nargs=3, metavar=("PROC", "SEQ", "PAGS"), help="imprime páginas de uma peça")
    a = ap.parse_args()
    if a.indexar: indexar()
    elif a.pagina: pagina(*a.pagina)
    elif a.termo: buscar(" ".join(a.termo), a.n, a.proc, ATOS if a.atos else (NARR if a.narrativas else None), a.inteiro)
    else: ap.print_help()
