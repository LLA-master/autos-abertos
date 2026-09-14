#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Estágio 11 — DECISÕES NA ÍNTEGRA. Publica o texto completo dos atos do juízo, sem dado pessoal.

Só entram peças assinadas por autoridade: decisão, despacho, acórdão, certidão de julgamento e
manifestação da Procuradoria-Geral da República. Representação policial, petição de defesa,
resposta de banco e anexo de investigação continuam fora, aqui como em todo o resto do projeto.

Duas camadas de proteção, e o build falha se qualquer uma não fechar:

1. Identificadores, por padrão: CPF, RG, título de eleitor, passaporte, CNH, telefone, e-mail,
   CEP, endereço com número, conta e agência bancária, inscrição de advogado com número, data de
   nascimento e endereço de IP viram etiqueta ([CPF], [endereço], [e-mail]…). O CNPJ fica: é
   registro de empresa, público por definição, e o site já o publica.
2. Pessoas protegidas, por curadoria (`pipeline/protegidos.py`): vítimas, testemunhas, familiares
   e terceiros que as crônicas já se recusaram a nomear. Cada um vira uma descrição do papel
   ("[o comandante da embarcação]"), que preserva o sentido do texto sem expor a pessoa.

Ao final, imprime o relatório de revisão: nomes que sobraram no texto publicado e não estão na
lista do que já é público no site. Serve para decidir, caso a caso, o que ainda proteger.

Uso: python3 pipeline/stage11_decisoes.py [--relatorio]
"""
import os, re, sys, json, unicodedata, collections, pathlib
import duckdb

ROOT = pathlib.Path(__file__).resolve().parent.parent
W = os.environ.get("BMDB_WORK", "./work") + "/corpus"
OUT = pathlib.Path(os.environ.get("BMDB_OUT", ROOT / "docs" / "data"))
DEST = OUT / "decisoes"
sys.path.insert(0, str(ROOT / "pipeline"))
from protegidos import PROTEGIDOS

ATOS = ("Decisao monocratica", "Despacho", "Acordao", "Inteiro teor do acordao",
        "Inteiro teor do acordao (completo)", "Certidao de julgamento", "Manifestacao da PGR")

MASCARAS = [
    (r"\b\d{3}\.?\d{3}\.?\d{3}\s*-?\s*\d{2}\b(?!\s*/)", "[CPF]"),
    (r"\bCPF\s*(n?[º°.:]?\s*)?\d[\d.\-\s]{8,}", "CPF [suprimido]"),
    (r"\bRG\s*(n?[º°.:]?\s*)?[\d.\-]{5,}", "RG [suprimido]"),
    (r"\b(passaporte|CNH|t[íi]tulo de eleitor)\s*(n?[º°.:]?\s*)?[A-Z]{0,2}[\d.\-]{5,}", r"\1 [suprimido]"),
    (r"[\w.\-]+@[\w\-]+\.[\w.\-]+", "[e-mail]"),
    (r"\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b", "[telefone]"),
    (r"\bCEP[:\s]*\d{2}\.?\d{3}\s*-?\s*\d{3}\b", "[CEP]"), (r"\b\d{2}\.?\d{3}-\d{3}\b", "[CEP]"),
    (r"\b(ag[êe]ncia|conta(\s+corrente|\s+poupan[çc]a)?)\s*(n?[º°.:]?\s*)?[\d.\-]{4,}", r"\1 [suprimido]"),
    (r"\bOAB[/\s]*[A-Z]{0,2}\s*(n?[º°.:]?\s*)?[\d.\-]{3,}", "OAB [suprimido]"),
    (r"\bnascid[oa] em \d{1,2}[/.]\d{1,2}[/.]\d{4}", "nascid@ em [data]"),
    # endereço: da via pública até onde o endereço acaba (número, complemento, bairro, cidade/UF)
    (r"(?:\b(?:Rua|Avenida|Alameda|Travessa|Pra[çc]a|Rodovia|Estrada|Quadra|SHIS|SQS|SQN|SAIS|SCS|SBS)\b|\b(?:R|Av|Al|Trav)\.)\s"
     r"(?:[^;\n]|\n(?!\s*\n)){0,70}?\d{1,5}\b"
     r"(\s*\([^)]{0,40}\))?"
     r"(\s*[.,]\s*(apto\.?|apartamento|ap\.|sala|conj\.?|conjunto|bloco|torre|casa|lote|andar|\d{1,3}\s*[ºo°]?\s*andar|\d{1,4})(?:[^,;\n]|\n(?!\s*\n)){0,30})*"
     r"(\s*[,–-]\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ](?:[^,;\n]|\n(?!\s*\n)){0,35})?"
     r"(\s*[,–-]?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ](?:[^,;\n]|\n(?!\s*\n)){0,30}/[A-Z]{2})?", "[endereço]"),
]
# o que não pode sobrar no texto publicado, de jeito nenhum
PROIBIDO = [(r"\d{3}\.\d{3}\.\d{3}-\d{2}", "CPF"), (r"\b\d{2}\.?\d{3}-\d{3}\b", "CEP"),
            (r"[\w.\-]+@[\w\-]+\.\w{2,}", "e-mail"),
            (r"\bOAB[/\s]*[A-Z]{0,2}\s*n?[º°.:]?\s*\d", "inscrição de advogado"),
            (r"\b(Rua|R\.|Avenida|Av\.|Alameda|Travessa|Pra[çc]a|Quadra|SHIS|SQS|SQN)\b[^;\n]{0,60}?\d{1,5}\b", "endereço"),
            (r"\bCPF\b(?![^\[\]]{0,12}\[)[^\[\n]{0,12}\d", "CPF sem máscara"),
            (r"\[endere[çc]o\]\s*[.,]?\s*\d", "resto de endereço"),
            (r"\[endere[çc]o\]\s*(?:[^;\n]|\n(?!\s*\n)){0,45}/[A-Z]{2}", "cidade depois do endereço"),
            (r"\[endere[çc]o\][A-Za-zÁ-ÿ]", "endereço colado")]

def norm(s):
    s = unicodedata.normalize("NFD", (s or "").upper())
    return " ".join("".join(c for c in s if unicodedata.category(c) != "Mn").split())

def limpa(t):
    t = re.sub(r"Documento assinado digitalmente.*?(?=\n|$)", "", t or "")
    t = re.sub(r"http\S*autenticarDocumento\S*", "", t)
    t = re.sub(r"sob o c[óo]digo \S+ e senha \S+", "", t, flags=re.I)
    t = re.sub(r"Supremo Tribunal Federal\s*(?=\n)", "", t)
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()

def mascara(t):
    for pat, rep in MASCARAS:
        t = re.sub(pat, rep, t, flags=re.I)
    # sobras de endereço que a quebra de página separou do resto
    t = re.sub(r"\[endereço\]\s*[.,]?\s*[\d.]{1,6}\s*(,\s*\d{1,3}\s*[ºo°]?\s*andar)?(\s*,\s*(TORRE|Conjunto|Sala|Bloco)[^,;\n]{0,20})*(\s*[,–-]\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^,;\n]{0,35})?(\s*[,–-]?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^,;\n]{0,30}/[A-Z]{2})?", "[endereço]", t, flags=re.I)
    def lista(m):
        corpo = m.group(2)
        return m.group(1) + " [endereço]" if re.search(r"\d", corpo) else m.group(0)
    t = re.sub(r"(\[CPF\]\))((?:[^;]|\n(?!\s*\n)){3,220}?)(?=;|\Z)", lista, t)
    # o endereço às vezes começa numa página e termina na seguinte; o rabo fica solto
    for _ in range(4):  # o rabo pode ter mais de um pedaço (bairro, cidade, UF)
        novo = re.sub(r"\[endereço\]\s*(?:(?:[^;\n]|\n(?!\s*\n)){0,45}?)(?:/[A-Z]{2}|Bras[íi]lia\b[^;\n]{0,20})", "[endereço]", t)
        if novo == t: break
        t = novo
    t = re.sub(r"\[endereço\](?:\s*\[endereço\])+", "[endereço]", t)
    t = re.sub(r"\[endereço\](?=[A-Za-zÁ-ÿ])", "[endereço] ", t)
    for nome, papel in PROTEGIDOS.items():
        t = re.sub(re.escape(nome), papel, t, flags=re.I)
    return t

def main():
    con = duckdb.connect()
    docs = con.execute(f"""select d.processo, CAST(d.seq AS INTEGER) seq, d.tipo, d.subtipo, d.id, d.pages
        from '{W}/docs.parquet' d where d.ext='pdf' and d.seq is not null and d.tipo in {ATOS}
        order by d.processo, seq""").fetchall()
    paginas = collections.defaultdict(list)
    for doc_id, page, text in con.execute(f"""select p.doc_id, p.page, p.text from '{W}/pages.parquet' p
        join '{W}/docs.parquet' d on d.id=p.doc_id where d.tipo in {ATOS} and d.seq is not null""").fetchall():
        paginas[doc_id].append((page, text))
    rastro = json.load(open(OUT / "rastro.json", encoding="utf-8"))
    data = {(p, e["s"]): e.get("d") for p, v in rastro.items() for e in v}

    DEST.mkdir(parents=True, exist_ok=True)
    for f in DEST.glob("*.json"):
        try: f.unlink()
        except FileNotFoundError: pass  # AppleDouble do exFAT some sozinho ao listar
    indice, problemas, nomes = [], [], collections.Counter()
    for processo, seq, tipo, subtipo, doc_id, pags in docs:
        cru = [limpa(t) for _, t in sorted(paginas.get(doc_id, []))]
        corpo = mascara("\x00".join(cru)).split("\x00")  # a peça é mascarada inteira, não página a página
        if not any(c.strip() for c in corpo): continue
        for i, pag in enumerate(corpo, 1):
            for pat, nome in PROIBIDO:
                for m in re.finditer(pat, pag, re.I):
                    problemas.append(f"{processo} seq {seq} p.{i}: {nome} → …{pag[max(0,m.start()-40):m.end()+40]}…")
        for pag in corpo:
            for m in re.finditer(r"\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ' ]{6,60}\b", pag):
                nomes[" ".join(m.group(0).split())] += 1
        slug = f"{processo.replace(' ', '')}-{seq:05d}"
        (DEST / f"{slug}.json").write_text(json.dumps(
            {"proc": processo, "seq": seq, "tipo": tipo, "sub": subtipo or "", "d": data.get((processo, seq)),
             "pags": corpo}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        indice.append({"proc": processo, "s": seq, "tipo": tipo, "d": data.get((processo, seq)),
                       "p": len(corpo), "c": sum(len(c) for c in corpo), "f": slug})
    if problemas:
        sys.exit("ESTÁGIO 11 FALHOU: dado pessoal sobrou no texto\n  " + "\n  ".join(problemas[:40]))
    (OUT / "decisoes.json").write_text(json.dumps(indice, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    kb = sum((DEST / f"{x['f']}.json").stat().st_size for x in indice) / 1024
    print(f"decisoes: {len(indice)} peças, {sum(x['p'] for x in indice):,} páginas, "
          f"{sum(x['c'] for x in indice)/1e6:.1f} M caracteres, {kb/1024:.1f} MB em {len(indice)} arquivos")

    if "--relatorio" in sys.argv:
        G = json.load(open(OUT / "graph.json", encoding="utf-8"))
        vis = {norm(n["label"]) for n in G["nodes"] if n.get("vis")}
        # variantes do mesmo nome (primeiro+último, sobrenome só) contam como já públicas
        al = con.execute(f"select value, canon from '{W}/graph_aliases.parquet'").fetchall()
        vis |= {norm(v) for v, c in al if norm(c) in vis}
        conhecido = lambda n: any(norm(n) in p or p in norm(n) for p in vis)
        ruido = re.compile(r"^(SOB SIGILO|DISTRITO FEDERAL|SEGUNDA TURMA|MINIST[EÉ]RIO|POL[IÍ]CIA|SUPREMO|PROCURADOR|GERAL DA|REFERENDO|SEM REPRESENTA|DE PODERES|O CONTROLE|PRATICADOS|INQU[EÉ]RITO|PARTICIPA[ÇC][ÕO]ES|EMPREENDIMENTOS|UNIPESSOAL|EMPRESARIAL|LTDA|S\.?A\.?$)")
        rep = [(n, c) for n, c in nomes.items()
               if len(n.split()) >= 2 and not ruido.match(norm(n)) and not conhecido(n)
               and norm(n) not in {norm(k) for k in PROTEGIDOS}]
        print(f"\nnomes em caixa alta no texto publicado, fora do que já é público: {len(rep)}")
        for n, c in sorted(rep, key=lambda x: -x[1])[:60]:
            print(f"  {c:>4}× {n}")

if __name__ == "__main__":
    main()
