#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Estágio 10 — BUSCA DO SITE. Índice invertido do que já é público, para o leitor procurar.

O acervo tem 189 mil páginas, mas o site publica só o que passou pelos gates: os excertos das
decisões, as crônicas, as fichas dos personagens, os resumos dos processos, o rastro documental e
o dossiê ilustrado. Este estágio indexa exatamente isso, e nada além — o texto integral dos autos
continua fora.

O que sai daqui é um índice invertido: para cada palavra, em que documentos ela aparece e
quantas vezes. O navegador recebe isso pronto e faz a busca por BM25 sem servidor, sem
rastreamento e sem depender de biblioteca externa. Como o índice guarda a palavra, e não a
frase, ele não permite reconstruir os textos que não publicamos.

Uso: python3 pipeline/stage10_busca.py [--en]
"""
import os, re, sys, json, math, unicodedata, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUT = pathlib.Path(os.environ.get("BMDB_OUT", DOCS / "data"))
# o que não pode aparecer no que o leitor vê. A palavra "CEP" pode: é a etiqueta que substitui o número.
FORB = [(r"\d{3}\.\d{3}\.\d{3}-\d{2}", "CPF"), (r"\b\d{2}\.?\d{3}-\d{3}\b", "CEP"),
        (r"OAB[/\s]*[A-Z]{0,2}\s*n?[º°.:]?\s*\d", "inscrição de advogado"),
        (r"[\w.\-]+@[\w\-]+\.\w{2,}", "e-mail")]
STOP = set("""a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre
ao aos à às e ou mas que se seu sua seus suas este esta estes estas esse essa isso aquele aquela
ele ela eles elas lhe lhes me te nos vos eu tu nós vós é foi ser são era eram será seria tem têm
tinha ter há havia como quando onde qual quais quem cujo cuja não sim já ainda também mais menos
muito pouco todo toda todos todas outro outra entre até desde após antes pelo pela pelos pelas
nesta neste nessa nesse daquele the of and to in for on with that this from
""".split())

def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")

def tokens(s):
    return [t for t in re.findall(r"[a-z0-9][a-z0-9\-']{2,}", norm(s)) if t not in STOP]

def stripfm(md):
    if md.startswith("---"):
        j = md.find("\n---", 3)
        if j > 0: return md[j + 4:]
    return md

def corta(s, n=230):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"

ENT = {"&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&mdash;": "—"}

def limpa(h):
    """texto visível de um pedaço de HTML (o dossiê é página estática, não JSON)"""
    h = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", h or "")
    h = re.sub(r"<[^>]+>", " ", h)
    for k, v in ENT.items(): h = h.replace(k, v)
    return re.sub(r"\s+", " ", h).strip()

def dossie(arq, en):
    """o dossiê ilustrado é uma página fora do app; entra na busca um documento por capítulo,
    e o resultado leva à âncora do capítulo, não ao topo da página"""
    html = arq.read_text(encoding="utf-8")
    corpo = html[html.find('<div class="dz'):html.find("</main>")]
    partes = re.split(r'<h2 class="cap" id="([^"]+)"><small>([^<]*)</small>([\s\S]*?)</h2>', corpo)
    lead = re.search(r'<p class="lead">([\s\S]*?)</p>', html)
    titulo = re.sub(r"\s*—.*$", "", re.search(r"<title>([\s\S]*?)</title>", html).group(1)).strip()
    abertura = limpa(partes[0])
    saida = [("dossie", arq.name, titulo, corta(limpa(lead.group(1)) if lead else abertura, 190),
              " ".join([titulo, limpa(lead.group(1)) if lead else "", abertura]))]
    for k in range(1, len(partes), 4):
        ident, cap, tit, texto = partes[k], partes[k + 1], limpa(partes[k + 2]), limpa(partes[k + 3])
        saida.append(("dossie", f"{arq.name}#{ident}", f"{cap} · {tit}", corta(texto, 190),
                      " ".join([titulo, cap, tit, texto])))
    return saida

def coletar(en):
    """devolve [(tipo, hash, titulo, subtitulo, textoParaBusca)] do que já é público"""
    d = lambda f: json.load(open(OUT / f, encoding="utf-8"))
    saida = []
    resumos = d("resumos_en.json" if en else "resumos.json")
    for proc, r in resumos.items():
        # o número do processo tem de ser procurável como o leitor o escreve: 15563 e 15.563
        num = proc.split()[-1]
        variantes = f"{proc} {num} {num[:-3]}.{num[-3:]}"
        corpo = " ".join([variantes, r["t"], r["o"]] + r["r"] + [m[1] for m in r["m"]])
        saida.append(("processo", f"processos?p={proc}", f"{proc} · {r['t']}", r["o"], corpo))
    for proc, xs in d("excertos.json").items():
        for x in xs:
            saida.append(("excerto", f"processos?p={proc}&x={x['s']}-{x['p']}", x["t"],
                          f"{proc} · seq {str(x['s']).zfill(5)} · p. {x['p']}",
                          " ".join([proc, x["t"], x.get("c", ""), x["x"]])))
    wiki = d("wiki_en.json" if en else "wiki.json")
    for p in wiki["pages"]:
        saida.append(("personagem", f"personagens?p={p['id']}", p["label"], p.get("resumo", ""),
                      " ".join([p["label"], p.get("resumo", "")] + [x["label"] for r in p.get("byrole", {}).values() for x in r])))
    # páginas das decisões publicadas na íntegra
    dec = json.load(open(OUT / "decisoes.json", encoding="utf-8")) if (OUT / "decisoes.json").exists() else []
    for m in dec:
        doc = json.load(open(OUT / "decisoes" / f"{m['f']}.json", encoding="utf-8"))
        for i, pag in enumerate(doc["pags"], 1):
            texto = re.sub(r"\s+", " ", pag).strip()
            if len(texto) < 120: continue
            saida.append(("pagina", f"decisao?d={m['f']}&p={i}",
                          f"{doc['proc']} · seq {str(doc['seq']).zfill(5)} · p. {i}",
                          corta(re.sub(r"^.{0,40}?(DECIS[ÃA]O|DESPACHO)[:\s]*", "", texto), 190),
                          " ".join([doc["proc"], doc["tipo"], texto])))

    dz = DOCS / ("primeyou.en.html" if en else "primeyou.html")
    if dz.exists(): saida += dossie(dz, en)
    else: print(f"aviso: {dz.name} não existe; o dossiê fica fora da busca")

    idx = json.load(open(DOCS / "posts" / "index.json", encoding="utf-8"))["posts"]
    pen = json.load(open(ROOT / "pipeline" / "en" / "posts_en.json", encoding="utf-8")) if en else {}
    for post in idx:
        base = DOCS / "posts" / ("en/" if en else "") / f"{post['slug']}.md"
        if not base.exists(): base = DOCS / "posts" / f"{post['slug']}.md"
        corpo = stripfm(base.read_text(encoding="utf-8"))
        t = pen.get(post["slug"], {}).get("t", post["title"]) if en else post["title"]
        sub = pen.get(post["slug"], {}).get("s", post.get("subtitle", "")) if en else post.get("subtitle", "")
        serie = (pen.get("_series", {}).get(post.get("serie"), post.get("serie")) if en else post.get("serie")) or ""
        saida.append(("cronica", f"cronicas?p={post['slug']}", t, (f"{serie} · " if serie else "") + corta(sub, 150),
                      " ".join([t, sub, serie, re.sub(r"[#*>`\[\]()]", " ", corpo)])))
    return saida

def main():
    en = "--en" in sys.argv
    docs = coletar(en)
    postings = collections.defaultdict(list)
    tamanhos = []
    for i, (_, _, _, _, corpo) in enumerate(docs):
        tf = collections.Counter(tokens(corpo))
        tamanhos.append(sum(tf.values()) or 1)
        for termo, n in tf.items():
            if len(termo) > 24: continue
            postings[termo].append([i, n])
    # termos que aparecem em quase tudo não ajudam a distinguir e só engordam o índice
    N = len(docs)
    postings = {t: p for t, p in postings.items() if len(p) < N * 0.6}
    saida = {
        "docs": [{"t": t, "h": h, "n": corta(tit, 120), "s": corta(sub, 190)} for t, h, tit, sub, _ in docs],
        "len": tamanhos, "avg": sum(tamanhos) / max(1, N),
        "idx": {t: p for t, p in sorted(postings.items())},
    }
    js = json.dumps(saida, ensure_ascii=False, separators=(",", ":"))
    visivel = json.dumps(saida["docs"], ensure_ascii=False)
    ruim = [(nm, len(re.findall(pat, visivel))) for pat, nm in FORB if re.findall(pat, visivel)]
    if ruim: sys.exit(f"GATE FALHOU (busca): {ruim}")
    alvo = OUT / ("busca_en.json" if en else "busca.json")
    alvo.write_text(js, encoding="utf-8")
    print(f"{alvo.name}: {N} documentos, {len(postings):,} termos, {len(js)//1024} KB")

if __name__ == "__main__":
    main()
