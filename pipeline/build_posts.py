#!/usr/bin/env python3
"""Crônicas: lê docs/posts/*.md (front matter: title, subtitle, date, tags) e escreve docs/posts/index.json e docs/feed.xml.
Não lê o acervo; só os textos publicados. Ordena por data decrescente. Minutos de leitura = palavras / 200.
Ao final, gera SEMPRE a edição em inglês (pipeline/build_en.py): en.html, app.en.js, wiki_en.json.
Se o original mudou sem tradução, o build en falha e este script devolve o mesmo erro. --sem-en pula essa etapa."""
import os, re, json, html, time, sys, subprocess
REPO=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); POSTS=f"{REPO}/docs/posts"; SITE="https://lla-master.github.io/autos-abertos/"
def fm(md):
    meta={}; body=md
    if md.startswith("---"):
        j=md.index("\n---",3); head=md[3:j].strip(); body=md[j+4:]
        for line in head.splitlines():
            if ":" in line:
                k,v=line.split(":",1); v=v.strip()
                meta[k.strip()]=[x.strip() for x in v.strip("[]").split(",")] if v.startswith("[") else v.strip('"')
    return meta, body
posts=[]
for f in sorted(os.listdir(POSTS)):
    if not f.endswith(".md") or f.startswith("._"): continue
    meta,body=fm(open(f"{POSTS}/{f}",encoding="utf-8").read())
    words=len(re.findall(r"\w+",body)); para=next((p for p in body.split("\n\n") if p.strip() and not p.startswith("#") and not p.startswith("<")),"")
    posts.append({"slug":f[:-3],"title":meta.get("title",f[:-3]),"subtitle":meta.get("subtitle",""),"date":meta.get("date","2026-01-01"),"tags":meta.get("tags",[]),"minutes":max(1,round(words/200)),"words":words,"serie":meta.get("serie",""),"capitulo":int(meta.get("capitulo",0) or 0),"excerpt":re.sub(r"[*_`>#]","",para)[:280]})
posts.sort(key=lambda p:(p["date"],p["serie"],p["capitulo"],p["slug"]))
for i,p in enumerate(posts): p["numero"]=i+1
# ordem de exibição: mais recente primeiro; dentro de uma série, capítulos em ordem
posts.sort(key=lambda p:(-int(p["date"].replace("-","")),p["serie"],p["capitulo"],p["numero"]))
for p in posts: print(f'  {p["numero"]:02d} {p["date"]} {p["words"]:5d} palavras  {(p["serie"]+" · cap. "+str(p["capitulo"])+" · ") if p["serie"] else ""}{p["title"]}')
json.dump({"gerado_em":time.strftime("%Y-%m-%d %H:%M UTC",time.gmtime()),"posts":posts},open(f"{POSTS}/index.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
items="".join(f"""  <item><title>{html.escape(p['title'])}</title><link>{SITE}#cronicas?p={p['slug']}</link><guid isPermaLink="false">bmdb-{p['slug']}</guid><pubDate>{time.strftime('%a, %d %b %Y 12:00:00 GMT',time.strptime(p['date'],'%Y-%m-%d'))}</pubDate><description>{html.escape(p['subtitle'] or p['excerpt'])}</description></item>\n""" for p in posts)
open(f"{REPO}/docs/feed.xml","w",encoding="utf-8").write(f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Crônicas do autos-abertos</title><link>{SITE}#cronicas</link><description>Textos curtos sobre o acervo público do caso Banco Master (Pet 15.556, STF). Opinião do autor do projeto; fatos com fonte.</description><language>pt-BR</language>
{items}</channel></rss>
""")
print(f"{len(posts)} crônicas -> index.json, feed.xml")
# Edição em inglês: sempre junto com a portuguesa, para as duas nunca divergirem.
if "--sem-en" not in sys.argv:
    r=subprocess.run([sys.executable,f"{REPO}/pipeline/build_en.py"])
    if r.returncode: sys.exit(r.returncode)
