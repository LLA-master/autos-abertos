#!/usr/bin/env python3
"""
baixar_acervo_stf.py — baixa, valida e extrai um acervo público do STF publicado em nota à imprensa.

Como funciona (o que de fato funcionou em 12.09.2026 para a Pet 15.556):
  1. Lê a nota à imprensa do STF e descobre o link de download vigente. No dia da publicação a nota
     apontava para um SharePoint (stfjusbr.sharepoint.com) que devolvia HTTP 429 — "excesso de
     solicitações de link anônimo" — para qualquer cliente. Horas depois a nota passou a apontar
     para um Azure Blob Storage do próprio STF (storagecompartexterno.blob.core.windows.net), que
     aceita HTTP Range e não tem throttle. Este script tenta o SharePoint uma vez, com educação, e
     cai para o blob; você também pode passar a URL direta.
  2. Baixa com retomada (curl -C -), tentativas com espera e verificação do Content-Length.
  3. Valida a assinatura 7z, testa o arquivo inteiro (7zz t) e só então extrai.
  4. Confere cada PDF (cabeçalho %PDF e trailer %%EOF) e cada MP4 (box ftyp) e escreve um manifesto
     com SHA-256, tamanho e resultado por arquivo.

Requisitos: python3, curl, 7zz (brew install sevenzip). Nada de pip.
Uso:
  python3 baixar_acervo_stf.py --nota https://noticias.stf.jus.br/postsnoticias/nota-a-imprensa-47/ --destino ./acervo
  python3 baixar_acervo_stf.py --url https://storagecompartexterno.blob.core.windows.net/processos-publicos/Pet16704/Pet16704.7z --destino ./acervo
Licença: MIT.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, time, urllib.request

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"

def log(msg): print(time.strftime("%H:%M:%S"), msg, flush=True)

def http_get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, dict(r.headers), r.read()

def descobrir_link(nota_url):
    """Devolve a lista de links candidatos encontrados na nota, na ordem: blob Azure, depois SharePoint."""
    status, _, body = http_get(nota_url)
    html = body.decode("utf-8", "replace")
    links = re.findall(r'https?://[^\s"\'<>]+', html)
    blob = [u for u in links if "blob.core.windows.net" in u]
    sp = [u for u in links if "sharepoint.com" in u]
    return list(dict.fromkeys(blob + sp))

def head(url):
    """HEAD do alvo: (status, content-length, aceita range?)"""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            cl = int(r.headers.get("Content-Length") or 0)
            return r.status, cl
    except urllib.error.HTTPError as e:
        return e.code, 0

def tentar_sharepoint(url):
    """Uma tentativa educada. Se vier 429, não insiste: é throttle do tenant para links anônimos."""
    try:
        st, _ = head(url)
    except Exception as e:
        log(f"SharePoint: falha de rede ({e}); pulando"); return False
    if st == 429:
        log("SharePoint respondeu 429 (excesso de solicitações de link anônimo). Não vou insistir; usando o blob."); return False
    log(f"SharePoint respondeu {st}; este script não implementa a extração do SharePoint — use o link do blob ou baixe pela interface.")
    return False

def baixar(url, destino, esperado):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    for tentativa in range(1, 200):
        have = os.path.getsize(destino) if os.path.exists(destino) else 0
        if esperado and have >= esperado: break
        log(f"download tentativa {tentativa}: {have:,} de {esperado:,} bytes")
        subprocess.run(["curl", "-sS", "-A", UA, "-C", "-", "--retry", "5", "--retry-delay", "10", "--retry-all-errors",
                        "--speed-limit", "10240", "--speed-time", "120", "-o", destino, url])
        time.sleep(3)
    have = os.path.getsize(destino)
    if esperado and have != esperado:
        sys.exit(f"tamanho divergente: {have} != {esperado}")
    with open(destino, "rb") as f:
        assert f.read(6) == b"7z\xbc\xaf\x27\x1c", "não é um arquivo 7z válido"
    log(f"download completo e assinatura 7z válida ({have:,} bytes)")

def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

def extrair(arq, pasta):
    z = shutil.which("7zz") or shutil.which("7z") or sys.exit("instale o 7-Zip: brew install sevenzip")
    log("testando integridade do 7z (lê o arquivo inteiro)")
    if subprocess.run([z, "t", arq, "-bso0", "-bsp0"]).returncode != 0: sys.exit("7z corrompido ou protegido")
    os.makedirs(pasta, exist_ok=True)
    log("extraindo")
    if subprocess.run([z, "x", arq, f"-o{pasta}", "-aos", "-bso0", "-bsp0"]).returncode != 0: sys.exit("falha na extração")

def validar(pasta, manifesto):
    ok = bad = 0; rows = []
    for dp, _, fn in os.walk(pasta):
        for n in fn:
            if n.startswith("._"): continue
            p = os.path.join(dp, n); low = n.lower(); sz = os.path.getsize(p); status = "ok"
            with open(p, "rb") as f:
                h = f.read(1024); f.seek(max(0, sz - 4096)); t = f.read()
            if low.endswith(".pdf") and not (h.startswith(b"%PDF-") and b"%%EOF" in t): status = "pdf-invalido"
            elif low.endswith(".mp4") and h[4:8] != b"ftyp": status = "mp4-invalido"
            elif sz == 0: status = "vazio"
            ok += status == "ok"; bad += status != "ok"
            rows.append({"arquivo": os.path.relpath(p, pasta), "bytes": sz, "sha256": sha256(p), "status": status})
    with open(manifesto, "w", encoding="utf-8") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    log(f"validação: {ok} ok, {bad} com problema; manifesto em {manifesto}")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nota", help="URL da nota à imprensa do STF (descobre o link de download)")
    ap.add_argument("--url", help="URL direta do pacote .7z (pula a descoberta)")
    ap.add_argument("--destino", default="./acervo", help="pasta de saída")
    ap.add_argument("--so-baixar", action="store_true", help="não extrai nem valida")
    a = ap.parse_args()
    if not a.url and not a.nota: ap.error("informe --url ou --nota")
    url = a.url
    if not url:
        cands = descobrir_link(a.nota); log(f"links na nota: {cands}")
        for u in cands:
            if "sharepoint.com" in u and not tentar_sharepoint(u): continue
            if "blob.core.windows.net" in u: url = u; break
        if not url: sys.exit("nenhum link utilizável na nota")
    st, esperado = head(url); log(f"alvo: {url} → HTTP {st}, {esperado:,} bytes")
    if st != 200: sys.exit(f"HEAD devolveu {st}")
    arq = os.path.join(a.destino, "_download", os.path.basename(url.split("?")[0]))
    baixar(url, arq, esperado)
    if a.so_baixar: return
    extrair(arq, os.path.join(a.destino, "arquivos"))
    validar(os.path.join(a.destino, "arquivos"), os.path.join(a.destino, "manifesto.jsonl"))
    with open(os.path.join(a.destino, "PROCEDENCIA.md"), "w", encoding="utf-8") as f:
        f.write(f"# Procedência\n\n- Origem: {a.nota or '(URL direta)'}\n- Pacote: {url}\n- Bytes: {esperado}\n- Baixado em: {time.strftime('%Y-%m-%d %H:%M %Z')}\n- Validação por arquivo em manifesto.jsonl (SHA-256).\n")

if __name__ == "__main__":
    main()
