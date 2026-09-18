# Roadmap

O que já existe, o que vem a seguir e o que foi decidido não fazer. Datas em UTC. Versões
seguem o selo no cabeçalho do site.

## Feito

| Versão | Data | O que entrou |
|---|---|---|
| v0.1 | 12.09.2026 | Pipeline de ponta a ponta (manifesto, OCR seletivo, corpus, extração, grafo, gate de sanitização, fichas). Site com tour guiado, grafo, mapa mental, personagens, processos, linha do tempo, método. |
| v0.2 | 13.09.2026 | Métricas de rede (pontes, influência, agrupamento, especificidade das ligações), filtro por período, vistas prontas, exportação e link permanente. Análise de rede. Primeiras crônicas. |
| v0.3 | 14.09.2026 | Processos contados: resumo, marcos e rastro documental de 1.868 peças em linguagem natural, com data inferida da própria peça. Busca no grafo com foco de vizinhança. |
| v0.4 | 14.09.2026 | Excertos dos atos do juízo (80), recortados do texto da peça por âncora literal: o build falha se a âncora não existir ou se repetir. "Nas palavras da decisão" no processo e "Citado nas decisões" na ficha. |
| v0.5 | 14.09.2026 | Busca no site (BM25 local, sem servidor) sobre excertos, crônicas, fichas e resumos. Busca de acervo para quem produz, que não sai da máquina. |
| v0.6 | 14.09.2026 | Decisões na íntegra: 206 atos do juízo, 1.169 páginas, com identificadores mascarados e terceiros protegidos por papel. Leitor paginado, busca cresce para 1.396 documentos. Edição integral em inglês das 40 crônicas. |
| v0.7 | 18.09.2026 | Personagens com condição nos autos (investigado ou alvo de medida, autoridade, advogado, instituição oficiada, citado), biografia e âmbito por processo, PT e EN, curados a partir dos atos do juízo; contagem de atos do juízo por nome; bancos oficiados em seção própria; vítimas e testemunhas fora da base; oito advogados reclassificados. Extração corrigida: nomes com conector (de, da, do) e qualquer "Paulo" voltaram à base, apelido errado ("Felipe Mourão" apontava para o irmão do banqueiro) corrigido, fusão de grafias e descarte de fragmentos. Grafo, mapa mental e análise de rede seguem fora do ar desde 17.09.2026 e não voltam. |

Estado em 18.09.2026: 15 processos, 716 entidades (353 visíveis), 125 fichas (71 curadas),
40 crônicas em oito séries, 80 excertos, 206 decisões na íntegra, edição em inglês completa.

## Próximo (setembro de 2026)

- **Séries que faltam.** Seis processos ainda não têm crônica: PET 15.693, 15.976, 15.977, 15.978, 16.019 e 16.662. Os resumos já existem; as séries vêm em seguida.
- **Link direto para a peça.** Hoje cada relação aponta processo, peça e página, e o leitor precisa abrir o pacote do STF. A intenção é hospedar as peças em um arquivo público sem custo por acesso e ligar cada referência ao PDF. Depende de revisão prévia: publicar o PDF bruto não é o mesmo que publicar o grafo sanitizado, e 57 peças de documentos de identificação ficam de fora de qualquer hipótese.
- **Correções por issue.** Homônimos e menções incidentais mal classificadas são corrigidos no arquivo de curadoria e republicados; o compromisso é responder rápido.

## Depois (outubro em diante)

- **Prints de poucas peças.** Só onde a forma é o conteúdo (uma tabela, um carimbo, uma anotação manuscrita), com recorte, porque o gate lê texto e não imagem.
- **Multimídia.** Os 49 vídeos do acervo ainda não foram tratados. Transcrição e o mesmo gate de sanitização antes de qualquer publicação.
- **Busca semântica na camada narrativa.** A busca é lexical: acha o jargão, não acha a paráfrase. Uma camada de embeddings só sobre peças narrativas (22 mil páginas) resolveria o caso do leigo que pergunta "o juiz pode prender para proteger a investigação". Fica para quando o custo de processamento se justificar.
- **Acompanhamento dos processos.** Os autos continuam andando. Um aviso quando entrar decisão nova, com o rastro atualizado.
- **Exportação.** Os dados já são CC BY 4.0 em `docs/data/`; falta documentar o formato para reúso por terceiros.
- **Revisão jurídica formal** da política de sanitização e das crônicas.

## Decidido não fazer, por ora

- Não hospedar o acervo bruto nem texto integral de peças que não sejam atos do juízo.
- Não publicar transcrição de conversa privada, mesmo que conste dos autos.
- Não vetorizar as 189 mil páginas: custo alto, ganho pequeno para quem conhece o jargão, e o leitor não pode buscar no corpus inteiro de qualquer forma.
- Não usar serviço de terceiros no site: sem analytics, sem CDN de dados, sem servidor de busca.
