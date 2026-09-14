# Segurança

Este repositório contém apenas código, dados derivados e sanitizados (`docs/data/`) e textos. Não contém, e não deve conter, acervo bruto, texto integral das peças, manifestos com nomes de arquivo, sais de pseudonimização ou arquivos de curadoria.

## O que reportar

- Dado pessoal que tenha escapado do gate de sanitização (CPF, inscrição profissional, endereço, telefone, e-mail, conta bancária, nome de arquivo do acervo, trecho de texto integral).
- Segredo ou credencial em qualquer commit.
- Vulnerabilidade no site estático (`docs/`) ou nos scripts do pipeline.

## Como reportar

- Preferencialmente pela aba **Security → Report a vulnerability** deste repositório (relato privado).
- Alternativamente, por issue, **sem transcrever o dado exposto**: indique apenas o arquivo e a linha.

## Compromisso

Relatos de dado pessoal exposto têm prioridade sobre qualquer outra tarefa: o dado é removido do arquivo e do histórico (com reescrita e força, se necessário), o gate é ajustado para cobrir o padrão, e a correção fica registrada.

## Controles em vigor

- Gate de exportação (`pipeline/stage6_export.py`) que falha ao detectar padrões proibidos.
- `.gitignore` bloqueando acervo, parquet, jsonl, manifestos, sais e arquivos de curadoria.
- Verificação automática de segredos e proteção de push (GitHub secret scanning) no repositório.
- Regras de proteção do ramo `main` contra reescrita de histórico e exclusão.
- Sem GitHub Actions, chaves de deploy ou webhooks.
- Site estático, sem backend, formulários, cookies ou rastreamento.
