# -*- coding: utf-8 -*-
"""Quem não é nomeado no texto publicado das decisões.

As crônicas já seguem esta regra: investigado nomeado em decisão pode ser nomeado; vítima,
testemunha, familiar e terceiro, não. Ao publicar as decisões na íntegra, a mesma regra precisa
valer, e por isso cada um destes nomes é trocado pela descrição do papel que exerce no texto.
A troca preserva o sentido da frase e tira a pessoa da vitrine.

Chave: o nome como aparece nos autos, incluindo as variantes usadas (só o primeiro nome, o
sobrenome sozinho). Valor: a descrição que entra no lugar, entre colchetes.
Ordem importa: o nome completo tem de vir antes das variantes curtas.
"""

PROTEGIDOS = {
    # vítimas das ameaças narradas na terceira fase
    "LUIS FELIPE WOYCEICHOSKI": "[o comandante da embarcação]",
    "LUÍS FELIPE WOYCEICHOSKI": "[o comandante da embarcação]",
    "Luis Felipe Woyceichoski": "[o comandante da embarcação]",
    "Luís Felipe Woyceichoski": "[o comandante da embarcação]",
    "WOYCEICHOSKI": "[o comandante da embarcação]",
    "LUIS FELIPE": "[o comandante da embarcação]",
    "LUÍS FELIPE": "[o comandante da embarcação]",
    "Luis Felipe": "[o comandante da embarcação]",
    "Luís Felipe": "[o comandante da embarcação]",
    "Woyceichoski": "[o comandante da embarcação]",
    "LEANDRO GARCIA DA SILVA": "[o chef de cozinha]",
    "Leandro Garcia da Silva": "[o chef de cozinha]",
    "LEANDRO GARCIA": "[o chef de cozinha]",
    "Leandro Garcia": "[o chef de cozinha]",
    # testemunha
    "TATIANA DANTAS CARTA": "[a chefe de comissários de bordo]",
    "Tatiana Dantas Carta": "[a chefe de comissários de bordo]",
    "TATIANA DANTAS": "[a chefe de comissários de bordo]",
    "Tatiana Dantas": "[a chefe de comissários de bordo]",
    # terceiros consultados ou visados, sem relação apurada com os crimes
    "RONALD FRED SEIKALY": "[o DJ]",
    "Ronald Fred Seikaly": "[o DJ]",
    "RONALD FRED": "[o DJ]", "Ronald Fred": "[o DJ]",
    "RENATA ALVES MOREIRA": "[uma pessoa consultada nos sistemas]",
    "Renata Alves Moreira": "[uma pessoa consultada nos sistemas]",
    "RENATA ALVES": "[uma pessoa consultada nos sistemas]",
    "Renata Alves": "[uma pessoa consultada nos sistemas]",
    "MARCELO SOUZA GONÇALVES": "[o nome constante do documento]",
    "Marcelo Souza Gonçalves": "[o nome constante do documento]",
    # agente público que apenas executou a abordagem
    "VINICIUS MARTINS": "[o policial rodoviário federal]",
    "Vinicius Martins": "[o policial rodoviário federal]",
    # familiares de investigados, que não são parte de nada
    "JULIA CRISTINA ALVES RIBEIRO": "[a esposa do investigado]",
    "Julia Cristina Alves Ribeiro": "[a esposa do investigado]",
    "GERSON FELIX DE OLIVEIRA": "[o pai do investigado]",
    "Gerson Felix de Oliveira": "[o pai do investigado]",
    # citados dentro de relatório de inteligência sobre procedimentos sigilosos de terceiros
    "ROBERTA MOREIRA LUCHSINGER": "[uma investigada em outro procedimento]",
    "Roberta Moreira Luchsinger": "[uma investigada em outro procedimento]",
    "Antonio Rueda": "[nome suprimido]", "ANTONIO RUEDA": "[nome suprimido]",
    "Antônio Rueda": "[nome suprimido]", "ANTÔNIO RUEDA": "[nome suprimido]",
    "ACM Neto": "[nome suprimido]", "ACM NETO": "[nome suprimido]",
}
