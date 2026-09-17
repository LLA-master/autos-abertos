#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera a versão em inglês do site a partir dos originais em português.

  docs/index.html  + pipeline/en/strings_html.py  → docs/en.html
  docs/app.js      + pipeline/en/strings_js.py    → docs/app.en.js
  docs/data/wiki.json                              → docs/data/wiki_en.json
  pipeline/resumos.py + pipeline/en/resumos_en.py  → docs/data/resumos_en.json
  pipeline/en/whoswho.html + primer.html (Who's who, Brazil primer) inseridos em en.html
  pipeline/en/posts_en.json  (títulos e subtítulos das crônicas em inglês → window.POSTS_EN)
  docs/posts/en/<slug>.md    (corpo das crônicas em inglês; app.en.js busca aqui e cai no original se faltar)
  docs/primeyou.en.html      (edição em inglês do dossiê; é FONTE, escrita à mão, como pipeline/en/whoswho.html)

O dossiê é texto longo e não passa pela tabela de substituição: a edição em inglês é um
arquivo próprio. Para que as duas não se separem em silêncio, o build guarda o sha256 do
original em pipeline/en/primeyou_stamp.json e FALHA se o português mudar. Depois de revisar
a tradução, rode --restamp.

Tradução por substituição de trechos exatos: se um trecho da tabela não for
encontrado no original (ou for encontrado mais de uma vez sem "all"), o build
FALHA. É proposital: sinaliza que o original mudou e a tradução precisa de
revisão. Nunca edite en.html / app.en.js / wiki_en.json à mão.

Uso: python3 pipeline/build_en.py [--js-only] [--check] [--restamp]
"""
import json, re, sys, hashlib, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT/"docs"
sys.path.insert(0, str(ROOT/"pipeline"/"en"))

def apply(text, table, label):
    errs = []
    for item in table:
        pt, en = item[0], item[1]
        mode = item[2] if len(item) > 2 else "one"
        n = text.count(pt)
        if n == 0:
            errs.append(f"{label}: trecho NÃO encontrado (o original mudou?):\n    {pt[:110]!r}")
        elif n > 1 and mode != "all":
            errs.append(f"{label}: trecho ocorre {n}× (marque \"all\" ou torne-o único):\n    {pt[:110]!r}")
        else:
            text = text.replace(pt, en)
    if errs:
        sys.exit("BUILD EN FALHOU\n" + "\n".join(errs))
    return text

ROLE_EN = {"pessoa":"Person","empresa":"Company","autoridade":"Official","advogado":"Lawyer"}
def wiki_en(w):
    out = {"gerado_em": w["gerado_em"], "pages": []}
    for p in w["pages"]:
        q = dict(p)
        proc_txt = ", ".join(f"{pr} ({c})" for pr, c in p["pe"][:5])
        s = (f"{p['label']} appears in {p['docs']} narrative filings across {p['procs']} of the 15 proceedings, "
             f"most often in {proc_txt}. The pipeline classifies it as {ROLE_EN.get(p['papel'], p['papel'])}. ")
        if p.get("peak"): s += f"The dates cited on the pages where the name appears cluster around {p['peak']}. "
        br = p.get("byrole", {})
        if br.get("pessoa"):
            s += f"Most frequently shares pages with {br['pessoa'][0]['label']}"
            s += f" and, among companies, with {br['empresa'][0]['label']}." if br.get("empresa") else "."
        elif br.get("empresa"):
            s += f"Among companies, most frequently shares pages with {br['empresa'][0]['label']}."
        q["resumo"] = s.strip()
        out["pages"].append(q)
    return out

def google_buttons(html):
    """Cards do who's who com data-google="Nome A|Nome B" ganham botões de busca no Google
    (um por nome). A query é o nome entre aspas mais "Banco Master", para desambiguar homônimos."""
    from urllib.parse import quote
    def btn(name):
        q = '"Banco Master"' if "Banco Master" in name else f'"{name}" "Banco Master"'
        label = "Search on Google"
        return (f'<a class="btn ghost small" href="https://www.google.com/search?q={quote(q)}" target="_blank" '
                f'rel="noopener" title="Web search for {name}; results are not part of the record">{label}</a>')
    def card(m):
        art = m.group(0); names = m.group(1).split("|")
        btns = " ".join(btn(n) if len(names) == 1 else btn(n).replace(">Search on Google<", f">Google: {n}<") for n in names)
        if '<div class="acts">' in art:
            return art.replace('</div></article>', " " + btns + '</div></article>', 1) if art.rstrip().endswith('</div></article>') else art.replace('</article>', f'<div class="acts">{btns}</div></article>', 1)
        return art.replace('</article>', f'\n      <div class="acts">{btns}</div></article>', 1)
    out, n = re.subn(r'<article class="ww-card" data-google="([^"]+)"[\s\S]*?</article>', card, html)
    print(f"who's who: {n} cards com busca no Google")
    return out

def dossie(restamp, check):
    """O dossiê Prime You tem edição em inglês própria (docs/primeyou.en.html). Aqui só se
    confere que ela não ficou para trás: se o português mudou, o build falha e pede revisão."""
    pt, en = DOCS/"primeyou.html", DOCS/"primeyou.en.html"
    stamp = ROOT/"pipeline"/"en"/"primeyou_stamp.json"
    if not pt.exists(): return
    h = hashlib.sha256(pt.read_bytes()).hexdigest()
    if not en.exists():
        print("aviso: docs/primeyou.en.html não existe (o menu em inglês apontaria para o vazio)"); return
    if restamp and not check:
        stamp.write_text(json.dumps({"primeyou.html": h, "conferido_em": datetime.date.today().isoformat()},
                                    ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"dossiê: selo regravado ({h[:12]}…)"); return
    if not stamp.exists():
        sys.exit("BUILD EN FALHOU: falta pipeline/en/primeyou_stamp.json. Confira docs/primeyou.en.html e rode --restamp.")
    velho = json.load(open(stamp, encoding="utf-8"))["primeyou.html"]
    if velho != h:
        sys.exit("BUILD EN FALHOU: docs/primeyou.html mudou depois da última revisão da edição em inglês.\n"
                 f"    selo: {velho[:12]}…  agora: {h[:12]}…\n"
                 "    Atualize docs/primeyou.en.html e depois rode: python3 pipeline/build_en.py --restamp")
    print("dossiê: edição em inglês conferida contra o original")


def main():
    js_only = "--js-only" in sys.argv
    check = "--check" in sys.argv
    from strings_js import JS
    app = apply((DOCS/"app.js").read_text(encoding="utf-8"), JS, "app.js")
    if not check: (DOCS/"app.en.js").write_text(app, encoding="utf-8")
    print(f"app.en.js: {len(JS)} substituições OK")
    if js_only: return
    from strings_html import HTML
    html = apply((DOCS/"index.html").read_text(encoding="utf-8"), HTML, "index.html")
    secs = "\n\n".join((ROOT/"pipeline"/"en"/f).read_text(encoding="utf-8") for f in ("whoswho.html","primer.html"))
    secs = google_buttons(secs)
    # {{sel:Rótulo}} → id do nó (link "abrir no grafo"); falha se o rótulo não existir na base
    w = json.load(open(DOCS/"data"/"wiki.json", encoding="utf-8"))
    g = json.load(open(DOCS/"data"/"graph.json", encoding="utf-8"))
    ids = {n["label"]: n["id"] for n in g["nodes"] if n.get("vis")}
    def sel(m):
        lab = m.group(1)
        if lab not in ids: sys.exit(f"BUILD EN FALHOU: rótulo sem nó visível no grafo: {lab!r}")
        return ids[lab]
    secs = re.sub(r"\{\{sel:([^}]+)\}\}", sel, secs)
    pen = json.load(open(ROOT/"pipeline"/"en"/"posts_en.json", encoding="utf-8"))
    posts = json.load(open(DOCS/"posts"/"index.json", encoding="utf-8"))["posts"]
    faltam = [x["slug"] for x in posts if x["slug"] not in pen] + [x["serie"] for x in posts if x.get("serie") and x["serie"] not in pen["_series"]]
    if faltam: print("aviso: crônicas/séries sem título em inglês (ficam em português):", sorted(set(faltam)))
    sem_corpo = [x["slug"] for x in posts if not (DOCS/"posts"/"en"/(x["slug"]+".md")).exists()]
    if sem_corpo: print(f"aviso: {len(sem_corpo)} crônicas sem edição em inglês em docs/posts/en/ (o app cai no original):", sem_corpo)
    else: print(f"crônicas: {len(posts)} com edição em inglês em docs/posts/en/")
    chron = '<script>window.POSTS_EN=' + json.dumps(pen, ensure_ascii=False) + '</script>' 
    assert html.count('<section id="v-rede"') == 1 and html.count('<div id="crCards"></div>') == 1
    html = html.replace('<section id="v-rede"', secs.rstrip()+"\n\n"+'<section id="v-rede"', 1)
    html = html.replace('<div id="crCards"></div>', chron.rstrip()+"\n    "+'<div id="crCards"></div>', 1)
    html = html.replace("<!doctype html>", "<!doctype html>\n<!-- GENERATED by pipeline/build_en.py from index.html. Edit index.html and pipeline/en/, not this file. -->", 1)
    left = re.findall(r"[çãõ]", re.sub(r"<[^>]+>", "", html))
    # resumos dos processos em inglês (pipeline/en/resumos_en.py) → docs/data/resumos_en.json
    from resumos_en import RESUMOS_EN
    sys.path.insert(0, str(ROOT/"pipeline"))
    from resumos import RESUMOS
    faltam_r = sorted(set(RESUMOS) - set(RESUMOS_EN))
    if faltam_r: sys.exit("BUILD EN FALHOU: resumos_en.py não cobre: " + ", ".join(faltam_r))
    if not check:
        (DOCS/"en.html").write_text(html, encoding="utf-8")
        json.dump({k: {"t": v["t"], "o": v["o"], "r": v["r"], "m": [list(x) for x in v["m"]], "s": v["s"]} for k, v in RESUMOS_EN.items()},
                  open(DOCS/"data"/"resumos_en.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        json.dump(wiki_en(w), open(DOCS/"data"/"wiki_en.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    dossie("--restamp" in sys.argv, check)
    print(f"en.html: {len(HTML)} substituições OK; wiki_en.json: {len(w['pages']) if not check else '-'} fichas")
    if left: print(f"aviso: {len(left)} caracteres ç/ã/õ restantes no texto visível de en.html (nomes próprios são esperados)")

if __name__ == "__main__":
    main()
