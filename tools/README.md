# tools/baixar_acervo_stf.py

Baixa, valida e extrai um acervo público do STF publicado em nota à imprensa. Foi o que trouxe os 25 GB da Pet 15.556 em 12.09.2026.

**O que aconteceu de verdade, para você não perder tempo:** o link de SharePoint da nota (`stfjusbr.sharepoint.com/:f:/s/CompartilhamentoExterno/…`) respondia **HTTP 429 — excesso de solicitações de link anônimo** — para qualquer cliente, navegador ou `curl`. É throttle do tenant, não bloqueio de IP. Horas depois a nota passou a apontar para um **Azure Blob Storage do próprio STF** (`storagecompartexterno.blob.core.windows.net`), que aceita HTTP Range e não tem throttle: um único `.7z` de 23,8 GB. O script lê a nota, prefere o blob, tenta o SharePoint uma vez por educação e não insiste.

```bash
brew install sevenzip   # 7zz
python3 tools/baixar_acervo_stf.py --nota https://noticias.stf.jus.br/postsnoticias/nota-a-imprensa-47/ --destino ./acervo
# ou, com a URL direta:
python3 tools/baixar_acervo_stf.py --url https://storagecompartexterno.blob.core.windows.net/processos-publicos/Pet16704/Pet16704.7z --destino ./acervo
```

Etapas: download com retomada (`curl -C -`) e conferência do `Content-Length` → assinatura 7z → `7zz t` no arquivo inteiro → extração → validação de cada PDF (`%PDF` e `%%EOF`) e MP4 (`ftyp`) → `manifesto.jsonl` com SHA-256 por arquivo → `PROCEDENCIA.md`.

Sem dependências Python além da biblioteca padrão. Licença MIT (a do repositório).
