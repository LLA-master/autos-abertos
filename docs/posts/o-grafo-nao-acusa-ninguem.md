---
title: "O grafo não acusa ninguém"
subtitle: "Manual de leitura para quem chegou achando que bolinha ligada é prova."
date: "2026-09-13"
tags: [grafo, leitura, método]
---

Há uma tentação em todo grafo, e é a mesma da fofoca: ver duas pessoas juntas e supor o resto. O grafo deste site tem 716 nomes e 4.980 ligações, e nenhuma delas prova coisa alguma. Vale dizer isso na primeira linha, porque a segunda já vai ser mais interessante.

## O que é uma ligação

Duas entidades se ligam quando aparecem na mesma página de uma peça narrativa: petição, decisão, despacho, representação da polícia. Anexos ficam de fora. Se contássemos anexos, um extrato bancário de mil páginas casaria todo mundo com todo mundo, e um contrato de milhares de páginas viraria a maior celebridade do caso. A espessura da linha é o número de peças em que os dois dividem página. Só isso. Dividir página com alguém numa petição pode significar sociedade, inimizade, ou o azar de ter o nome na mesma lista.

> Uma ligação é um convite a ler a peça. Não é a peça.

## Quem aparece mais, e por quê

O nome que mais aparece no acervo é o do relator, o ministro André Mendonça: 252 peças narrativas nos quinze processos. Não é notícia; é o ofício. Quem assina despacha, e quem despacha assina. Depois vem Daniel Bueno Vorcaro, o controlador do Banco Master: 141 peças, presente nos quinze processos, com 167 ligações no grafo. Este, sim, é o centro geométrico do caso, e seria estranho que não fosse: os autos são sobre o banco dele. O ministro Dias Toffoli aparece em 88 peças de cinco processos. O próprio Banco Master, como entidade, em 48 peças de nove processos, com 163 ligações.

Repare no que os números dizem e no que não dizem. Dizem quem os autos discutem. Não dizem o que discutem, nem em que qualidade cada um é discutido. Para isso existe a coluna "Onde conferir", e para isso existem os autos.

## Os advogados, ou o bloco que engana

Há 62 advogados no grafo, e por padrão eles estão escondidos. Não por descortesia. É que advogado assina petição com advogado, dez nomes ao pé da mesma página, e o resultado é um bloco denso, lindo de ver e inútil de ler: diz apenas "trabalham na mesma banca". Ligue o filtro se quiser conhecer os escritórios. Desligue quando quiser entender o caso.

## As pessoas sem nome

Metade dos nomes do grafo, 359 de 716, aparece como código: "Pessoa A1B2C3". São pessoas que os autos mencionam de passagem e que nenhuma decisão nomeia. O código é estável, isto é, a mesma pessoa tem sempre o mesmo código, e por isso você pode ver que "alguém" liga dois nomes sem saber quem é esse alguém. Se essa pessoa um dia for nomeada numa decisão, o nome aparece. Até lá, o site prefere ser menos informativo a ser cruel.

## Pontes, núcleos e o que vale a pena olhar

O site calcula, para cada nome, uma medida chamada intermediação, aqui traduzida como "pontes": quantos caminhos entre outros pares passam por aquele nó. Quem tem muitas pontes com poucas peças é a figura mais interessante de qualquer rede: aparece pouco, mas liga partes que de outro modo não se tocariam. O gráfico "Volume × ponte", na aba [Análise](#rede), mostra exatamente isso, e o canto superior esquerdo dele é onde um repórter deveria começar.

Os "núcleos" são comunidades detectadas por algoritmo: grupos de nomes mais ligados entre si do que com o resto. Há 17. O algoritmo não sabe o que são; batiza cada um pelos dois nós mais ligados, e é você quem lê a peça e decide se aquilo é uma empresa, uma família, uma banca ou uma coincidência de anexo.

E há a ferramenta mais simples e mais útil: "Em comum A ∩ B", nos ajustes do [grafo](#grafo). Escolha dois nomes; o site lista quem divide página com ambos. É a pergunta clássica de apuração, "o que liga fulano a beltrano?", respondida com uma lista e as páginas onde conferir.

## O que o grafo erra

Erra em homônimos: dois Josés da Silva podem ter virado um. Erra por OCR: cerca de três mil páginas eram imagem pura e foram lidas por máquina, e a máquina troca letras. Erra por grafia: "S.A." e "SA" já foram unidos; outras variantes ainda escapam. Cada erro desses tem um lugar para ser reportado, e a correção fica no histórico. Um site que se pretende fonte precisa errar em público.

Bolinha ligada não é prova. É endereço. Vá à página.

<div class="fonte"><b>Fontes.</b> Contagens do grafo: <code>docs/data/meta.json</code> e <code>docs/data/graph.json</code> (nós, ligações, papéis, núcleos). Presença por processo e por peça de cada nome: ficha em Personagens e tabela "Onde conferir". Definição das métricas: seção Método. Páginas passadas por OCR: 3.331, segundo o manifesto local (1,8% do total).</div>
