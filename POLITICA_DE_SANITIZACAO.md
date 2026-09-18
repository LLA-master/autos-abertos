# Política de sanitização

O STF retirou o sigilo destes autos e os publicou. Isso torna os documentos públicos; não torna irrelevante a proteção de dados pessoais de quem aparece neles por acaso. Este projeto separa as duas coisas com uma regra simples: **o que é ato público e interesse público entra com nome; o que é dado pessoal incidental não entra, ou entra sem identificar.**

## O que entra com nome

- **Empresas e entidades** (CNPJ é registro público).
- **Autoridades** no exercício da função: ministros, procuradores, delegados, agentes que assinam peças.
- **Advogados** atuando nos autos, identificados pelo recibo de petição eletrônica ou pela inscrição profissional junto ao nome. O número de inscrição não é publicado.
- **Pessoas nomeadas em decisão monocrática, despacho ou petição inicial**: quando um ato judicial público cita alguém pelo nome, o nome é informação pública.
- **Pessoas recorrentes**: citadas em ao menos dois processos e três peças narrativas distintas. Recorrência entre processos é sinal de papel relevante nos fatos, não de menção incidental.
- **Exceção que vale sobre todas as regras acima**: vítimas, testemunhas, familiares e terceiros listados em `pipeline/protegidos.py` nunca são nomeados, em nenhuma saída, ainda que uma decisão os nomeie e ainda que sejam recorrentes. Na base viram pseudônimo; nas decisões na íntegra o nome é trocado pelo papel na frase; não ganham ficha.
- **Condição nos autos**: a ficha de cada personagem diz se o nome é investigado ou alvo de medida, autoridade, advogado, instituição oficiada ou apenas citado, por curadoria a partir dos atos do juízo (`pipeline/personagens.py`). Bancos e órgãos que só receberam ordens do juízo são rotulados como tal e não têm lista de coocorrência, para que ter um investigado como cliente não pareça envolvimento.

## O que entra pseudonimizado

- Todas as demais pessoas físicas. Recebem um código estável ("Pessoa A1B2C3") derivado de um sal local que não está no repositório. O código permite ver que "alguém" liga dois pontos do grafo sem dizer quem.

## O que nunca entra

- CPF, RG, número de inscrição profissional, endereço, telefone, e-mail, conta bancária, chave Pix.
- Nomes de arquivo e subtítulos das peças, porque contêm nomes.
- Texto integral ou trechos dos documentos.
- Qualquer coisa das 57 peças classificadas como "Documentos de identificação".
- Valores monetários extraídos automaticamente, porque a extração de extratos bancários é inconfiável.

## Como o gate funciona

O único script que escreve em `docs/data/` é `pipeline/stage6_export.py`. Ele aplica as regras acima, gera um relatório local com o motivo de visibilidade de cada nó e **falha** (não escreve nada publicável) se detectar na saída qualquer padrão de CPF, inscrição profissional, endereço, CEP ou nome de arquivo. Um arquivo local de overrides permite corrigir manualmente a visibilidade de um nó, e essas correções ficam documentadas no relatório.

## Como pedir correção

Se você aparece neste site e entende que sua menção é incidental, ou que há erro de identificação (nomes homônimos são possíveis), abra uma issue. A regra pode errar; o compromisso é corrigir rápido.

## Crônicas

A seção Crônicas do site é editorial: textos de opinião do autor do projeto sobre os mesmos dados públicos. Segue a mesma política: nenhum nome que a base pseudonimiza aparece numa crônica; nenhum dado pessoal; nenhuma afirmação de culpa. Quando uma crônica cita um número, o número está em `docs/data/`; quando cita uma peça, indica processo, seq e página. Erros de fato se corrigem no texto, com nota.
