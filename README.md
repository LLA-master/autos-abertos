# autos-abertos

Base de dados aberta e navegável sobre o acervo que o Supremo Tribunal Federal tornou público em 11 de setembro de 2026: os autos da Petição 15.556 e de quatorze procedimentos conexos da chamada **Operação Compliance Zero** (Banco Master). São 4.258 documentos e 189 mil páginas, processados para que jornalistas, pesquisadores e curiosos possam explorar quem aparece com quem, em que peça e em que momento.

**Site:** `docs/` (GitHub Pages). **Fonte primária:** [nota à imprensa do STF](https://noticias.stf.jus.br/postsnoticias/nota-a-imprensa-47/).

## O que há aqui

- `docs/` — o site estático: tour guiado, grafo de relações (com métricas de rede, vistas prontas, filtro por período, exportação e link permanente), mapa mental, fichas por entidade, análise de rede, processos, linha do tempo e crônicas.
- `docs/posts/` — as crônicas, em Markdown com cabeçalho (título, subtítulo, data, tags); `docs/posts/en/` — a edição integral em inglês de cada uma. `pipeline/build_posts.py` gera `docs/posts/index.json` e `docs/feed.xml`. São textos de opinião do autor, separados da base.
- `docs/data/` — os dados derivados e sanitizados que o site consome (JSON). É a **única** coisa que sai do acervo.
- `pipeline/` — os scripts que produzem esses dados a partir do acervo bruto (que não está neste repositório e não deve estar).
  `stage8_rastro.py` monta o rastro documental de cada processo (`docs/data/rastro.json`) e publica os resumos escritos à mão em `pipeline/resumos.py` (`docs/data/resumos.json`), ambos pelo mesmo gate de sanitização do estágio 6.
  `stage9_excertos.py` recorta os excertos dos atos do juízo a partir da curadoria em `pipeline/excertos.py`, verificando cada trecho-âncora no texto da peça.
  `stage11_decisoes.py` publica o texto integral dos atos do juízo com os dados pessoais mascarados (curadoria em `pipeline/protegidos.py`).
  `stage10_busca.py` monta o índice invertido da busca do site (só sobre o que já é público). `busca.py` é a busca no acervo local, que indexa o texto integral e por isso nunca sai desta máquina.
- `tools/baixar_acervo_stf.py` — baixa, valida e extrai o pacote público do STF a partir da nota à imprensa (com a história do 429 do SharePoint documentada).
- `POLITICA_DE_SANITIZACAO.md` — o que entra, o que não entra, e por quê.
- `METODOLOGIA.md` — como o texto foi extraído, como as entidades e relações foram inferidas, e os limites disso.

## O que não há aqui, de propósito

Nenhum PDF, nenhum texto integral, nenhum CPF, número de inscrição profissional, endereço, telefone, conta bancária ou nome de arquivo. Pessoas que aparecem incidentalmente nos autos (terceiros, testemunhas, titulares de contas) são pseudonimizadas. Ver a política.

## Como conferir uma informação

Cada relação no grafo aponta para peças específicas (processo, número sequencial e página). Os autos completos estão no pacote público do STF linkado na nota à imprensa. O site não hospeda os documentos.

## Reproduzir

```bash
export BMDB_RAW=/caminho/para/arquivos   # PDFs extraídos do pacote do STF
export BMDB_WORK=/caminho/para/work      # área de trabalho local
python3 -m venv $BMDB_WORK/.venv && $BMDB_WORK/.venv/bin/pip install -r pipeline/requirements.txt
for s in 1 2 3 4 5 6 7; do $BMDB_WORK/.venv/bin/python pipeline/stage${s}_*.py; done
python3 pipeline/build_posts.py   # crônicas: índice e feed, e em seguida a edição em inglês (build_en.py)
```

Requer `poppler` (pdftotext/pdfinfo), `tesseract` com o pacote `por` e `ocrmypdf`.

## O que o site calcula (v0.2)

Além das contagens (peças, processos, menções), o estágio 6 exporta métricas de rede por nó: intermediação ("pontes"), PageRank ("influência"), coeficiente de agrupamento, parcela das ligações que sai do núcleo e número de atos judiciais (decisão, despacho, petição inicial) em que o nome aparece; por ligação, a especificidade (lift) e as datas citadas por trimestre. O navegador recalcula pontes e influência sobre o recorte visível. Definições e limites em `METODOLOGIA.md` e na seção Método do site.

## Edição em inglês

`docs/en.html` (com `docs/app.en.js` e `docs/data/wiki_en.json`) é gerada por `pipeline/build_en.py` a partir dos originais em português, por substituição de trechos exatos declarados em `pipeline/en/strings_html.py` e `pipeline/en/strings_js.py`. Se o original mudar sem tradução correspondente, o build falha de propósito. As seções exclusivas da edição em inglês (who's who e primer sobre o Brasil) ficam em `pipeline/en/whoswho.html` e `pipeline/en/primer.html`; títulos e subtítulos das crônicas em inglês, em `pipeline/en/posts_en.json`; o texto integral de cada crônica em inglês fica em `docs/posts/en/<slug>.md` (mesmo cabeçalho, título e subtítulo em inglês), e `app.en.js` busca ali, caindo no original em português se a tradução faltar; `build_en.py` avisa quais crônicas ainda não têm edição em inglês. A edição em inglês é gerada **sempre** ao final de `pipeline/build_posts.py`, para que as duas versões nunca divergam (use `--sem-en` para pular). Depois de editar `index.html`, `app.js`, crônicas ou o `wiki.json`, rode:

```bash
python3 pipeline/build_posts.py   # PT-BR e EN
```

`python3 pipeline/build_en.py` continua funcionando sozinho (`--check` só valida, sem escrever).

## Licenças

Código: MIT (`LICENSE`). Dados derivados em `docs/data/`: CC BY 4.0 (`DATA_LICENSE`). Os documentos originais são atos públicos do STF.

## Projeto pessoal

Este é um projeto independente de cidadania. Não é afiliado ao STF, à Polícia Federal, ao Ministério Público ou a qualquer parte dos processos.
