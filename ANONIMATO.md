# Anonimato do projeto

Este repositório é mantido sob pseudônimo. Não é capricho: o caso envolve pessoas com dinheiro,
advogados e, segundo os próprios autos, um grupo que monitorava jornalistas e críticos. O que
segue é o que foi feito para que ninguém chegue de um commit a uma pessoa, o que continua
exposto por natureza, e as regras de operação para não estragar o que já está protegido.

## O que já está fechado

**Identidade nos commits.** Autor e committer são `LLA-master <LLA-master@users.noreply.github.com>`
em todos os commits, do primeiro ao último. Nenhum e-mail real aparece em nenhum ponto do
histórico.

**Fuso horário.** Todo commit é gravado em UTC (`+0000`). Antes, o carimbo `-0300` em cada commit
dizia o país; o horário do dia dizia a rotina. `commitar.sh` grava sempre em UTC e o gancho recusa
commit feito fora dele.

**Linha do tempo coerente com a conta.** O histórico foi importado de um repositório anterior, e
por isso trazia commits com data anterior à criação desta conta. Quem cruzasse dados públicos do
GitHub veria que a história veio de outro lugar. As datas foram reescritas para dentro da janela
da conta, preservando a ordem.

**Caminhos de máquina.** Nenhum script traz caminho absoluto. O pipeline lê `BMDB_WORK`, que por
padrão aponta para `./work`. Nome de volume, nome de usuário do sistema e estrutura de pastas não
estão no repositório nem no histórico.

**Barreira automática.** `.githooks/pre-commit` recusa qualquer commit que contenha caminho de
máquina, endereço de e-mail pessoal, chave privada ou fuso diferente de UTC. Os padrões
específicos, como nomes de contas anteriores e de pessoas, ficam em `.githooks/padroes.local`,
que não é versionado: publicar a lista do que se quer esconder é uma forma de revelar exatamente
isso. Instale com `git config core.hooksPath .githooks` (o `commitar.sh` faz isso sozinho).

**Sem assinatura.** `commit.gpgsign` desligado. Uma chave GPG assinando commits é um identificador
tão bom quanto um nome, e liga contas entre si. Nenhuma das contas tem chave SSH ou GPG pública.

**Perfil vazio.** A conta não tem nome, foto, bio, empresa, localização, site nem contatos, não
segue ninguém e não tem estrelas. Atividade pública é rastro.

**Sem metadados de autoria no site.** Não há `<meta name="author">`, `generator`, `dc:creator` ou
campo de autor no feed RSS. As crônicas são assinadas como "o autor do projeto", sem nome.

## O que continua exposto, e não tem solução técnica

**A escrita.** Estilo é impressão digital. Quem já leu outros textos da mesma pessoa pode
reconhecer a voz, e existem ferramentas que fazem isso automaticamente. É o vetor mais forte que
sobra, e nenhum ajuste de git resolve.

**O assunto.** Um projeto sobre um caso brasileiro, escrito em português, com conhecimento de
processo penal e de mercado financeiro, já descreve bastante quem o escreve.

**O horário dos pushes.** O commit vai em UTC, mas o GitHub registra quando o push chegou, e isso
é público. Uma sequência de pushes sempre entre 9h e 19h de Brasília descreve um fuso. Empurrar
em horários variados ajuda; nada mais.

**Repositórios anteriores.** Um repositório público some do GitHub quando apagado, mas serviços
que arquivam eventos públicos do GitHub podem ter guardado que ele existiu, com nome e dono. Se o
nome do repositório novo for igual ao do antigo, a ligação é imediata. O conteúdo idêntico é uma
ligação mais fraca, porém real.

**Cópias privadas.** Qualquer cópia do mesmo conteúdo em outra conta, ainda que privada, é uma
ligação pronta caso essa conta seja comprometida ou intimada.

## Regras de operação

1. Commit só por `./commitar.sh`. Nunca `git commit` direto.
2. Nunca desligar o gancho com `--no-verify` sem ler o que ele apontou.
3. Não responder a issue com detalhe que situe a pessoa: cidade, horário, rotina, profissão.
4. Não reaproveitar em outro lugar nenhum texto publicado aqui, e vice-versa.
5. Não logar nesta conta pela mesma sessão de navegador das outras contas.
6. 2FA por aplicativo, nunca por SMS. Em Settings → Emails, manter marcado
   "Keep my email addresses private" e "Block command line pushes that expose my email".
7. Não vincular domínio próprio ao site. Registro de domínio é dado público.
8. Não aceitar colaboração que exija identificação.
