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
6. **Gate de sanitização.** Único ponto de saída para `docs/data/`. Ver `POLITICA_DE_SANITIZACAO.md`. Na v0.2 o estágio também calcula, sobre o grafo completo: intermediação (betweenness, distância = 1/peso, normalizada), PageRank ponderado, coeficiente de agrupamento, parcela do peso das ligações que sai da comunidade Louvain do nó, e o número de peças de tipo decisão monocrática, despacho ou petição inicial em que o nome aparece. Por ligação: lift = peças em comum observadas ÷ esperadas sob independência (peças de A × peças de B ÷ peças narrativas com alguma entidade, 775), e as datas citadas nas páginas em comum, por trimestre (`edges_tl.json`), usadas pelo filtro temporal do grafo.
7. **Fichas dos personagens.** A partir dos dados públicos já sanitizados, mais a curadoria de `pipeline/personagens.py`: condição nos autos (investigado ou alvo de medida, autoridade, advogado, instituição oficiada, apenas citado), biografia e âmbito por processo, escritos a partir dos atos do juízo e com a fonte (processo, seq, página) em cada ficha. A ficha conta ainda em quantos atos do juízo publicados o nome aparece, por processo. O que não foi curado aparece como "condição não apurada"; o resumo automático conta peças e não diz mais com quem o nome "divide páginas", porque esse dado sugere relação onde há só coocorrência (um banco oficiado ao lado do investigado que lá tem conta). Vítimas, testemunhas e familiares (`pipeline/protegidos.py`) são pseudonimizados na exportação e não têm ficha.

**Gate (repetido por importância).** Único ponto de saída para `docs/data/`. Ver `POLITICA_DE_SANITIZACAO.md`.

## O que medir e o que não medir
- Contagens de peças e processos por entidade são robustas.
- Coocorrência por página é um sinal de leitura, não de relação.
- Lift bruto privilegia pares raros (duas pessoas com três peças cada e três em comum têm lift máximo); por isso o site ordena pares por peças em comum × log(lift), e só considera pares com ao menos três peças em comum.
- Intermediação e PageRank calculados sobre o grafo completo são distorcidos por advogados (assinam juntos) e autoridades (assinam tudo). O site recalcula as duas medidas sobre o recorte visível; o valor global fica na ficha como referência.
- O filtro por período usa datas citadas nas páginas em que os dois nomes aparecem; um trimestre "ativo" para uma ligação significa que as peças que juntam os dois falam daquele período, não que algo aconteceu entre eles nesse período.
- Somas monetárias foram descartadas: extratos concatenam dígitos e produzem valores absurdos.
- Datas citadas por mês descrevem sobre que período as peças falam, não quando os fatos ocorreram.

## Rastro documental e excertos
O rastro de cada processo (`stage8_rastro.py`) descreve cada peça pelo que ela é, com data, número e páginas. A data sai do texto da própria peça, com preferência para a assinatura na última página; na falta dela, dos metadados do PDF. Datas fora da janela que vai de junho de 2025 a 11 de setembro de 2026, quando o STF publicou o acervo, são descartadas: em geral são datas citadas dentro do texto, não a data da peça.

Os excertos (`stage9_excertos.py`) são trechos literais recortados do texto da peça pelo próprio pipeline. A curadoria em `pipeline/excertos.py` aponta processo, número da peça, página e um trecho-âncora; se a âncora não estiver naquela página, ou estiver mais de uma vez, o build falha. Nenhum excerto é digitado, o que elimina erro de transcrição e citação inventada. Só podem ser citados atos assinados por autoridade: decisão, despacho, acórdão e manifestação da Procuradoria-Geral da República. Representação policial, petição de defesa e anexo de investigação ficam de fora, porque é neles que está transcrição de conversa privada e dado de terceiro. O limite é de 600 caracteres por excerto e vale o mesmo gate de padrões proibidos da exportação.

## Decisões na íntegra
`stage11_decisoes.py` publica o texto completo dos atos do juízo: 206 peças, 1.169 páginas, 1,7 milhão de caracteres. Duas camadas de proteção, e o build falha se qualquer uma não fechar. A primeira é automática e cobre identificadores: CPF, RG, passaporte, CNH, título de eleitor, telefone, e-mail, CEP, endereço com número, conta e agência bancária, inscrição de advogado com número e data de nascimento viram etiqueta entre colchetes. O CNPJ fica, por ser registro de empresa. A segunda é curadoria: `pipeline/protegidos.py` lista vítimas, testemunhas e familiares que as crônicas já se recusavam a nomear, e troca cada nome pela descrição do papel.

Duas armadilhas encontradas ao montar isso, ambas resolvidas: um padrão de endereço IP casava com valores em reais de dez dígitos, destruindo as cifras do caso; e CPFs partidos pela quebra de página escapavam quando o mascaramento era feito página a página, o que exigiu passar a mascarar a peça inteira de uma vez.

## Busca
Duas buscas, com alcances diferentes. A do site (`stage10_busca.py`) indexa apenas o que já é público: excertos, crônicas, fichas e resumos, 263 documentos. O que vai ao navegador é um índice invertido com a frequência de cada palavra por documento, não o texto; o ranqueamento é BM25, roda localmente e nada é enviado a servidor algum.

A busca do acervo (`busca.py`) é local e nunca publicada. Indexa as 188.665 páginas com texto, 344 milhões de caracteres, com a extensão FTS do DuckDB, e responde em cerca de um segundo com processo, peça, página e o trecho ao redor da ocorrência. O banco resultante fica na área de trabalho local, que está no `.gitignore`, porque contém o texto integral do acervo. É a ferramenta de leitura de quem produz o site, não um serviço para o leitor.

A busca é lexical nos dois casos: encontra as palavras escritas, com radical e sem acento, e não encontra paráfrase. Numa prova simples, "conveniência da instrução criminal" acha o fundamento da prisão preventiva em primeiro lugar, enquanto "o juiz pode prender para proteger a investigação" não acha. Uma camada de embeddings resolveria esse caso e custaria algumas horas de processamento e cerca de um gigabyte; por ora, não se justifica.

## Reprodutibilidade
Com o pacote do STF e as ferramentas listadas no README, os estágios reproduzem `docs/data/` de ponta a ponta. O layout do grafo é calculado no navegador (ForceAtlas2) e pode variar levemente entre execuções.
