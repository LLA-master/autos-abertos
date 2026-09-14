# Metodologia

## Fonte e integridade
- Nota à imprensa do STF de 11/09/2026, pacote `Pet16704.7z` (23.826.852.064 bytes) publicado em blob público do Tribunal. Extraído: 4.258 PDF e 49 MP4, 27.233.129.282 bytes, todos validados individualmente (cabeçalho e trailer). Só o texto foi usado; a multimídia ficou fora.
- Cada arquivo tem hash SHA-256 registrado no manifesto local. O manifesto contém nomes de arquivo com nomes de pessoas e por isso **não** é publicado.

## Estágios do pipeline (`pipeline/`)
1. **Manifesto e texto.** `pdfinfo` + `pdftotext -layout` por página; páginas com menos de 40 caracteres são marcadas como imagem. 189.371 páginas, 1,8% imagem.
2. **OCR seletivo.** `ocrmypdf --pages` só nas páginas-imagem, idioma `por`, texto fundido ao do estágio 1. PDFs com assinatura digital exigem `--invalidate-digital-signatures` porque o PDF de saída é descartado.
3. **Corpus.** Parquet de documentos e de páginas.
4. **Extração estruturada.** Regex para número CNJ, CNPJ, CPF (armazenado só como hash salgado, nunca publicado), inscrição profissional, valores, datas, referências a processos do STF e nomes em caixa alta. A conjunção "e" não é tratada como conector de nome.
5. **Grafo.** Só peças narrativas (petições, decisões, despachos, manifestações, representações da PF). Anexos (extratos, tabelas, procurações, recibos, documentos de identificação) ficam fora. Duas entidades se ligam quando dividem uma página; peso = peças distintas em comum. Stoplist para timbre, marca d'água, endereços, fórmulas processuais. Apelidos: variantes que diferem só por acento são unidas; nomes com mesmo primeiro e último nome e subsequência de nomes do meio também. Nomes emendados (A imediatamente seguido de B, ambos conhecidos) são divididos. Papéis: empresa, autoridade, advogado, pessoa (ver site, seção Método).
6. **Gate de sanitização.** Único ponto de saída para `docs/data/`. Ver `POLITICA_DE_SANITIZACAO.md`.

## O que medir e o que não medir
- Contagens de peças e processos por entidade são robustas.
- Coocorrência por página é um sinal de leitura, não de relação.
- Somas monetárias foram descartadas: extratos concatenam dígitos e produzem valores absurdos.
- Datas citadas por mês descrevem sobre que período as peças falam, não quando os fatos ocorreram.

## Reprodutibilidade
Com o pacote do STF e as ferramentas listadas no README, os seis estágios reproduzem `docs/data/` de ponta a ponta. O layout do grafo é calculado no navegador (ForceAtlas2) e pode variar levemente entre execuções.
