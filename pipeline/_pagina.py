#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ferramenta de leitura: imprime o texto de uma página exatamente como o estágio 9 o vê.
Use para escolher o trecho-âncora de um excerto (copie dali, literalmente).

  python3 pipeline/_pagina.py "PET 15563" 17 3        uma página
  python3 pipeline/_pagina.py "PET 15563" 17 1-21     um intervalo
"""
import sys, os, duckdb
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stage9_excertos import limpa, W
proc, seq, pags = sys.argv[1], int(sys.argv[2]), sys.argv[3]
a, b = (pags.split("-") + [None])[:2] if "-" in pags else (pags, pags)
con = duckdb.connect()
did = con.execute(f"select id from '{W}/docs.parquet' where processo=? and seq=? and ext='pdf'", [proc, seq]).fetchone()
if not did: sys.exit("peça não encontrada")
for p in range(int(a), int(b) + 1):
    r = con.execute(f"select text from '{W}/pages.parquet' where doc_id=? and page=?", [did[0], p]).fetchone()
    print(f"\n===== {proc} seq {seq} página {p} =====")
    print(limpa(r[0]) if r else "(sem texto)")
