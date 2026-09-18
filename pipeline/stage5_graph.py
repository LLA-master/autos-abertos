#!/usr/bin/env python3
"""Estágio 5 (v1): grafo de coocorrência restrito a peças narrativas (petições, decisões, despachos,
relatórios), ponderado por documentos distintos, com stoplist de timbre/marca d'água e resolução de
apelidos por subsequência. Peças-anexo (extratos, tabelas, procurações, IDs) ficam fora do grafo."""
import duckdb, re
import os
W=os.environ.get("BMDB_WORK","./work"); c=duckdb.connect()
c.execute(f"CREATE VIEW m AS SELECT * FROM '{W}/corpus/mentions.parquet'")
c.execute(f"CREATE VIEW d AS SELECT * FROM '{W}/corpus/docs.parquet'")
NARR=("Peticao","Peticao inicial","Decisao monocratica","Despacho","Manifestacao","Manifestacao da PGR","Prisao preventiva",
      "Busca e apreensao","Inquerito","Sequestro","Outras pecas","Vista a PGR","Mandado","Restituicao de coisas apreendidas","Certidao de julgamento")
STOP=r'\b(SIGILOSO|SIGILO|PF|DELECOR|DRPJ|SR|CORRUPÇÃO|CRIMES|FINANCEIROS|TERCEIRO|INTERESSADO|VINCULO|VINCULADO|PESQUISADO|CCS|PAS|CVM|SEI|APENSO|VOLUME|MINISTRO|RELATOR|REQTE|REQDO|INTDO|ADV|SOB|OUTRO|OUTROS|I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XX|XL|LV|LIV|CF|CPP|CP|CPC|STF|STJ|TRF|TJ|MPF|PGR|AGU|CGU|COAF|BACEN|BCB|RFB|PRF|ABIN|GSI|DF|SP|RJ|MG|RS|PR|SC|BA|GO|ES|PE|CE|AM|PA|MT|MS|DIREITO|PROCESSUAL|PENAL|CIVIL|DATA|DISTRIBUIÇÃO|PEDIDOS|FATOS|ANÁLISE|CONTEXTUALIZAÇÃO|PROCEDIMENTO|DADOS|NOTA|CIÊNCIA|REFERÊNCIA|PROCURAÇÃO|OUTORGANTE|OUTORGADO|COMPLIANCE|ZERO|OPERAÇÃO|LAVA|JATO|AGÊNCIA|CONTA|EXTRATO|SALDO|VALOR|TOTAL|RELATÓRIO|LAUDO|PARECER|MANIFESTAÇÃO|INQUÉRITO|BUSCA|APREENSÃO|PRISÃO|PREVENTIVA|TEMPORÁRIA|MEDIDA|CAUTELAR|HABEAS|CORPUS|AGRAVO|RECURSO|EMBARGOS|SENTENÇA|ACÓRDÃO|TURMA|PLENÁRIO|DESEMBARGADOR|JUIZ|JUÍZA|PROMOTOR|PROCURADOR|DELEGADO|ESCRIVÃO|AGENTE|PERITO|ANALISTA|AUDITOR|FISCAL|SERVIDOR|SÓCIO|ADMINISTRADOR|DIRETOR|PRESIDENTE|GERENTE|EXCELÊNCIA|SENHOR|SENHORA|DOUTOR|DOUTORA|ILUSTRÍSSIMO|EXCELENTÍSSIMO|MERITÍSSIMO|EGRÉGIO|COLENDO|SUPREMO|TRIBUNAL|FEDERAL|JUSTIÇA|MINISTÉRIO|PÚBLICO|PROCURADORIA|GERAL|REPÚBLICA|POLÍCIA|DELEGACIA|RECEITA|SECRETARIA|GABINETE|VARA|SEÇÃO|SUBSEÇÃO|COMARCA|CERTIDÃO|MANDADO|OFÍCIO|DESPACHO|DECISÃO|PETIÇÃO|TERMO|AUTO|AUTOS|ANEXO|ANEXOS|DOC|DOCS|FLS|FL|ART|ARTS|INC|LEI|CNJ|OAB|CPF|CNPJ|RG|CEP|PIX|TED|DOC|NACIONAL|CENTRAL|ESTADUAL|MUNICIPAL|UNIÃO|ESTADO|MUNICÍPIO|GOVERNO|CONGRESSO|SENADO|CÂMARA|DEPUTADO|SENADOR|GOVERNADOR|PREFEITO|VEREADOR|PARTIDO|SÃO|RIO|BELO|HORIZONTE|PORTO|ALEGRE|CURITIBA|SALVADOR|RECIFE|FORTALEZA|MANAUS|GOIÂNIA|CAMPINAS|SANTOS|BRASÍLIA|BRASIL|JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO|SEGUNDA|TERÇA|QUARTA|QUINTA|SEXTA|SÁBADO|DOMINGO|FEIRA|QUEDA|RAIO|DANOS|ELÉTRICOS|AERONAVES|SERVIÇOS|RISCO|MARINGÁ|DESPESAS|RESULTADO|PATRIMÔNIO|BALANÇO|LÍQUIDO|VENCIMENTO|GARANTIA|SUBSCRIÇÃO|COLOCAÇÃO|ENCARGOS|DEBÊNTURES|NOTAS|COMERCIAIS|RESOLUÇÃO|CMN|IRREGULARIDADE|DETECTADA|RELATO|SUCINTO|OCORRÊNCIAS|ESCLARECIMENTOS|INICIAIS|MENSAGEM|AUTOMÁTICA|REQUERIMENTO|ILMO|FORO|LOGRADOURO|NÚMERO|COMPLEMENTO|ATIVIDADES|ECONÔMICAS|SECUNDÁRIAS|DESCRIÇÃO|REGISTRO|INTEROPERABILIDADE|ENTRADA|ENHANCED|STATUSCODES|MAIL|FROM|ELETRÔNICO|LESÃO|CORPORAL|SIM|AAA|HASH|AVENÇAS|CONTAS|PRAZO|LONGO|CURTO|CAUTELARES|PROVAS|COMPARTILHAMENTO|ANTERIORMENTE|ESPECIFICADAS|EXCETO|INDICAR|QUEM|BEM|COMO|GENTILEZA|ACUSAR|DEVEDORES|DIVERSOS|SEGURANÇA|ESPECIALIZADA|JUNTO|CARTEIRAS|SETOR|RELAÇÃO|SOCIETÁRIA|QUALIFICAÇÃO|INVESTIGADOS|SESSÃO|EXTRAORDINÁRIA|ASSINE|ECONOMIA|IPHONE|COR|AZUL|MARINHO|PRESI|PARA|SUBSCRITO|RESPONSAVEL|RESPONSÁVEL|SCP|RECURSOS|HUMANOS|ESPECÍFICA|TÉCNICA|PADRONIZADO|ATUALMENTE|MILICIANOS|MORATÓRIOS|ANTECIPADO|OPERACIONAL|ADMINISTRATIVAS|OPERACIONAIS|VENDAS|PELO|PELA|PELOS|PELAS|INTIME|INTIMEM|INTIME-SE|CITE|CITE-SE|OFICIE|OFICIE-SE|NOTIFIQUE|DETERMINO|DEFIRO|INDEFIRO|DECIDO|CONSIDERANDO|QUE|NÃO|NAO|ENVOLVENDO|DIREITOS|CREDITÓRIOS|CREDITORIOS|SISTEMA|FINANCEIRO|SOCIAL|AUTOR|AUTORA|RÉ|REU|APELANTE|APELADO|RECORRENTE|RECORRIDO|EXEQUENTE|EXECUTADO|EMBARGANTE|EMBARGADO|IMPETRANTE|IMPETRADO|PACIENTE|RUA|AVENIDA|AV|ALAMEDA|TRAVESSA|PRAÇA|PRACA|RODOVIA|ESTRADA|QUADRA|LOTE|BLOCO|CONJUNTO|APTO|APARTAMENTO|ANDAR|SALA|EDIFÍCIO|EDIFICIO|CONDOMÍNIO|CONDOMINIO|BAIRRO|JARDIM|JARDINS|VILA|PARQUE|CHÁCARA|CHACARA|SÍTIO|SITIO|FAZENDA|CEP|URGÊNCIA|URGENCIA|BAIXA|SJDF|SJSP|PROCESSOS|CRIMINAIS|MOBILIÁRIOS|MOBILIARIOS|SUBSTABELECE|SUBSTABELECIMENTO|RESERVAS|FLAGRANTE|DELITO|ORDEM|JUDICIAL|POLO|ATIVO|PASSIVO|ADVOGADOS|ADVOGADO|RECLTE|RECLDO|PACTE|IMPTE|IMPDO|COATOR|AUTORIDADE|INTERESSADO|INTERESSADA|REQUERENTE|REQUERIDO|INVESTIGADO|INVESTIGADA|DENUNCIADO|ACUSADO|RÉU|REU|VÍTIMA|TESTEMUNHA|DECLARANTE|DEPOENTE|CONDUZIDO|INDICIADO|ASSINADO|DIGITALMENTE|DOCUMENTO|ASSINATURA|ELETRÔNICA|CÓDIGO|VERIFICADOR|AUTENTICAÇÃO|PÁGINA|PAG|PÁG|CLÁUSULA|PARÁGRAFO|ÚNICO|CAPUT|INCISO|ALÍNEA|ITEM|SUBITEM|PARTE|CAPÍTULO|TÍTULO|LIVRO|SEÇÃO)\b'
c.execute(f"""CREATE TABLE names AS
 SELECT regexp_replace(regexp_replace(upper(trim(regexp_replace(m.value,'\\s+(LTDA|EIRELI|ME|EPP|S\\.?A\\.?|S/A|DTVM|CCTVM|CIA|LTD|LLC|INC)\\.?$',''))),'^BCO ','BANCO '),'^NOVO BCO ','NOVO BANCO ') AS value, m.doc_id, m.processo, m.page, m.pos, d.tipo,
        regexp_matches(m.value,'\\s(LTDA|EIRELI|ME|EPP|S\\.?A\\.?|S/A|DTVM|CCTVM|CIA|LTD|LLC|INC)\\.?$|\\b(BANCO|EMPREENDIMENTOS|PARTICIPA[ÇC][ÕO]ES|INVESTIMENTOS|HOLDING|CONSULTORIA|ASSET|TRUST|CAPITAL|GEST[ÃA]O|SECURITIZADORA|INCORPORADORA|CONSTRUTORA|ADMINISTRADORA|CORRETORA|DISTRIBUIDORA|SEGURADORA|FACTORING|FUNDO)\\b') empresa
 FROM m JOIN d ON d.id=m.doc_id
 WHERE m.kind='caps_name' AND d.tipo IN {NARR}
 AND len(string_split(m.value,' ')) BETWEEN 2 AND 6
 AND NOT regexp_matches(m.value,'{STOP}') AND NOT regexp_matches(regexp_replace(m.value,'\\s+(S\\.?A\\.?|S/A)$',''),'[&/0-9.]')
 AND NOT regexp_matches(regexp_replace(m.value,'(^| )(DE|DA|DO|DAS|DOS|DI|DEL|E)( |$)',' ','g'),'(^| )[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{{1,2}}( |$)')   -- token de 1-2 letras é sigla ou fragmento, salvo os conectores de nome (DE, DA, DO...), que antes derrubavam PAULO SÉRGIO NEVES DE SOUZA e ANA CLAUDIA QUEIROZ DE PAIVA
 AND NOT regexp_matches(m.value,'^(DE|DA|DO|DAS|DOS|E) | (DE|DA|DO|DAS|DOS|DI|DEL|E)$')
 AND NOT regexp_matches(m.value,'\\b(SÃO PAULO|SAO PAULO|RIO DE JANEIRO|BELO HORIZONTE|DISTRITO FEDERAL|PORTO ALEGRE|NOVA LIMA|SANTA CATARINA|MINAS GERAIS|ESPÍRITO SANTO|ESPIRITO SANTO|MATO GROSSO|SÃO JOSÉ|SAO JOSE|SÃO VICENTE)\\b')   -- lugares; antes PAULO inteiro estava na stoplist e levava junto qualquer Paulo   -- conector no começo ou no fim é pedaço de frase, não nome
 AND NOT regexp_matches(m.value,'\\b(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO|MANDADO|BUSCA|INTIMAÇÃO|DELEGACIA|REPRESSÃO|DEPARTAMENTO|ORDEM|DIA|LEI|MINISTÉRIO|JUSTIÇA|FAZENDA|SECRETARIA|PREVIDÊNCIA|AUTORIZAÇÃO|APLICAÇÃO|REPÚBLICA|PROCURADOR-GERAL|CIRCUNSTANCIADO|AUTO|TERMO|OFÍCIO|CERTIDÃO|DESPACHO|DECISÃO|PETIÇÃO|JUÍZO|VARA|SEÇÃO|JUDICIÁRIA|TRIBUNAL|SUPREMO|SUPERIOR|REGIONAL|CÂMARA|SENADO|CONGRESSO|ESTADO|UNIÃO|GOVERNO|PREFEITURA|CIDADE|RUA|AVENIDA|PRAÇA|BAIRRO|SISTEMA|CADASTRO|CLIENTES|PESSOA|PESSOAS|FÍSICA|JURÍDICA|TITULAR|PROCURADOR|RESPONSÁVEL|REPRESENTANTE|CONTRATO|CNPJ|CPF|RG|MATRÍCULA|NÚMERO|ANO|MÊS|HORA|HORAS|FOLHA|FLS|PÁGINA|PÁGINAS|ITEM|ANEXO|DOCUMENTO|DOCUMENTOS|ASSINADO|ASSINATURA|DIGITAL|ELETRÔNICO|ELETRÔNICA|NOME|FANTASIA|COMPROVANTE|INSCRIÇÃO|INSTRUMENTO|MANDATO|OBRIGAÇÃO|PAGAR|FAZER|GUIA|RECOLHIMENTO|PRESO|PROMOTORIA|MANIPULAÇÃO|PREÇOS|FUNDOS|ORIGEM|ALTERACAO|ALTERAÇÃO|DECLARAÇÃO|DESIMPEDIMENTO|INDEXADOR|CUSTO|EMISSÃO|INTEGRALIZAÇÃO|MEIO|PERÍODO|CAPTALIZAÇÃO|DESENQUADRAMENTO|PRESTACAO|PRESTAÇÃO|REPUTACIONAL|CONTRATOS|FORMAL|REGISTROS|CONTÁBEIS|QUESTIONAMENTO|FISCALIZAÇÃO|PROCESSO|OBJETO|SUPERVISÃO|MERCADOS|TRANSMISSÃO|QR-CODE|CORRESPONDENTE|CONSELHEIRO|PORTE|JUCESP|SIMBA|SENATRAN|CDI|FGTS|IMPETRANTE|PACIENTE|REQUERENTE|RECLAMANTE|AUTOR|RÉU|DENUNCIADO|ACUSADO|INVESTIGADO|INVESTIGADA|TESTEMUNHA|DEPOENTE|DECLARANTE)\\b')""")
c.execute("CREATE TABLE freq AS SELECT value, count(DISTINCT doc_id) docs, count(DISTINCT processo) procs, count(*) n FROM names GROUP BY 1 HAVING docs>=3")
known={v for (v,) in c.sql("SELECT value FROM freq WHERE len(string_split(value,' ')) BETWEEN 2 AND 3").fetchall()}
splits=[]
for (v,) in c.sql("SELECT value FROM freq WHERE len(string_split(value,' '))>=4").fetchall():
    t=v.split()
    for k in range(2,len(t)-1):
        a,b=" ".join(t[:k])," ".join(t[k:])
        if a in known and b in known: splits.append((v,a,b)); break
if splits:
    c.execute("CREATE TABLE splits (value VARCHAR, a VARCHAR, b VARCHAR)"); c.executemany("INSERT INTO splits VALUES (?,?,?)",splits)
    c.execute("INSERT INTO names SELECT s.a, n.doc_id, n.processo, n.page, n.pos, n.tipo, regexp_matches(s.a,'\\b(BANCO|EMPREENDIMENTOS|PARTICIPA[ÇC][ÕO]ES|INVESTIMENTOS|HOLDING|CONSULTORIA|ASSET|TRUST|CAPITAL|GEST[ÃA]O|SECURITIZADORA|INCORPORADORA|CONSTRUTORA|ADMINISTRADORA|CORRETORA|DISTRIBUIDORA|SEGURADORA|FACTORING|FUNDO)\\b') FROM names n JOIN splits s USING(value)")
    c.execute("INSERT INTO names SELECT s.b, n.doc_id, n.processo, n.page, n.pos, n.tipo, regexp_matches(s.b,'\\b(BANCO|EMPREENDIMENTOS|PARTICIPA[ÇC][ÕO]ES|INVESTIMENTOS|HOLDING|CONSULTORIA|ASSET|TRUST|CAPITAL|GEST[ÃA]O|SECURITIZADORA|INCORPORADORA|CONSTRUTORA|ADMINISTRADORA|CORRETORA|DISTRIBUIDORA|SEGURADORA|FACTORING|FUNDO)\\b') FROM names n JOIN splits s USING(value)")
    c.execute("DELETE FROM names WHERE value IN (SELECT value FROM splits)")
    c.execute("DROP TABLE freq"); c.execute("CREATE TABLE freq AS SELECT value, count(DISTINCT doc_id) docs, count(DISTINCT processo) procs, count(*) n FROM names GROUP BY 1 HAVING docs>=3")
print("nomes emendados divididos:",len(splits))
import unicodedata
def norm(v): return "".join(ch for ch in unicodedata.normalize("NFD",v) if unicodedata.category(ch)!="Mn").upper()
rows=c.sql("SELECT value, docs FROM freq ORDER BY len(string_split(value,' ')) DESC, docs DESC").fetchall()
# 1) variantes que só diferem por acento/cedilha -> forma com mais docs
best={}
for v,d in rows:
    k=norm(v)
    if k not in best or d>best[k][1]: best[k]=(v,d)
canon={v:best[norm(v)][0] for v,_ in rows}
docs_of={v:d for v,d in rows}
CONN=("DE","DA","DO","DAS","DOS","E","DI","DEL")
def tokens(v): return [t for t in norm(v).split() if t not in CONN]
# 1b) mesma sequência de nomes, só com conector a mais ou a menos (DANIEL BUENO DE VORCARO = DANIEL BUENO VORCARO) -> forma com mais docs
bykey={}
for v,d in rows:
    k=" ".join(tokens(v))
    if k not in bykey or d>docs_of[bykey[k]]: bykey[k]=v
for v,_ in rows:
    if canon[v]==v: canon[v]=bykey[" ".join(tokens(v))]
# regra de sufixo único: entidade de 2 ou 3 nomes que é o final exato de UMA única entidade conhecida (>=4 palavras, docs>=5) vira apelido dela
longs4=[(v,d) for v,d in rows if len(v.split())>=4 and d>=5 and canon[v]==v]
for v,d in rows:
    if canon[v]!=v or not 2<=len(tokens(v))<=3 or len(v.split())>=4: continue
    nv=norm(v); hits=[L for L,_ in longs4 if norm(L).endswith(" "+nv)]
    if len(hits)==1 and docs_of[hits[0]]>=d: canon[v]=hits[0]
# regra de prefixo único: nome de 2 a 4 palavras que é o começo exato de UMA única entidade mais longa (docs>=5) vira apelido dela
# (MARILSON ROSENO -> MARILSON ROSENO DA SILVA; ALBERTO FELIX -> ALBERTO FELIX DE OLIVEIRA NETO); JOÃO CARLOS fica, porque começa vários nomes
longs_all=[(v,tokens(v)) for v,d in rows if d>=5 and canon[v]==v]
for v,d in rows:
    if canon[v]!=v: continue
    tv=tokens(v)
    if not 2<=len(tv)<=4: continue
    hits=[L for L,tl in longs_all if len(tl)>len(tv) and tl[:len(tv)]==tv]
    if len(hits)==1 and docs_of[hits[0]]>=d: canon[v]=hits[0]   # o nome longo tem de ser o mais frequente; senão é nome emendado por OCR absorvendo o certo
# 2) apelidos por subsequência (mesmo primeiro e último nome), sobre a forma normalizada
def subseq(s,l):
    it=iter(l); return all(t in it for t in s)
longs=[]
for v,_ in sorted({best[k][0]:best[k][1] for k in best}.items(), key=lambda x:(-len(x[0].split()),-x[1])):
    tv=tokens(v); hit=None
    for L in longs:
        tl=tokens(L)
        if len(tv)<len(tl) and tv[0]==tl[0] and tv[-1]==tl[-1] and subseq(tv,tl): hit=L; break
    if hit:
        for k2,v2 in list(canon.items()):
            if v2==v: canon[k2]=hit
    else: longs.append(v)
import csv, os
ap=f"{W}/aliases_override.csv"
if os.path.exists(ap):
    ov_al={r["variante"].strip():r["canonico"].strip() for r in csv.DictReader(open(ap,encoding="utf-8")) if r.get("variante")}
    # aplica em dois níveis: variante direta e qualquer valor cujo canon atual seja uma variante
    for k in list(canon):
        if k in ov_al: canon[k]=ov_al[k]
        elif canon[k] in ov_al: canon[k]=ov_al[canon[k]]
    for k in ov_al:
        if k not in canon: canon[k]=ov_al[k]
c.execute("CREATE TABLE canon (value VARCHAR, canon VARCHAR)"); c.executemany("INSERT INTO canon VALUES (?,?)",list(canon.items()))
c.execute(f"CREATE VIEW pg AS SELECT doc_id, page, text FROM '{W}/corpus/pages.parquet'")
c.execute("""CREATE TABLE nm AS SELECT c.canon entity, n.doc_id, n.processo, n.page, n.tipo, n.empresa,
   substr(pg.text, greatest(1,n.pos-160), 160+len(c.canon)+160) ctx FROM names n JOIN canon c USING(value) JOIN pg ON pg.doc_id=n.doc_id AND pg.page=n.page""")
c.execute(f"""CREATE TABLE allm AS SELECT c.canon entity, m.doc_id, m.page, d.tipo, d.pages npages,
   substr(pg.text, greatest(1,m.pos-160), m.pos-greatest(1,m.pos-160)) pre, substr(pg.text, m.pos+len(m.value)+1, 220) post
   FROM m JOIN d ON d.id=m.doc_id JOIN canon c ON c.value=regexp_replace(regexp_replace(upper(trim(regexp_replace(m.value,'\\s+(LTDA|EIRELI|ME|EPP|S\\.?A\\.?|S/A|DTVM|CCTVM|CIA|LTD|LLC|INC)\\.?$',''))),'^BCO ','BANCO '),'^NOVO BCO ','NOVO BANCO ')
   JOIN pg ON pg.doc_id=m.doc_id AND pg.page=m.page WHERE m.kind='caps_name'""")
c.execute("""CREATE TABLE sig AS SELECT entity, max(cobertura) cob_max FROM (SELECT entity, doc_id, count(DISTINCT page)*1.0/max(npages) cobertura FROM allm WHERE npages>=300 GROUP BY 1,2) GROUP BY 1""")
c.execute("""CREATE TABLE roles0 AS SELECT entity,
   avg(CASE WHEN regexp_matches(post,'^[^\\n]{0,4}[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{0,40}[,\\s(]{0,4}(brasileir[oa]|advogad[oa]|inscrit[oa]|OAB)[^.;]{0,160}OAB') OR regexp_matches(post,'^[^\\n]{0,60}OAB') THEN 1 ELSE 0 END) p_oab,
   sum(CASE WHEN regexp_matches(post,'^[^\\n]{0,4}[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{0,40}[,\\s(]{0,4}(brasileir[oa]|advogad[oa]|inscrit[oa]|OAB)[^.;]{0,160}OAB') OR regexp_matches(post,'^[^\\n]{0,60}OAB') THEN 1 ELSE 0 END) n_oab,
   sum(CASE WHEN tipo='Recibo de peticao eletronica' AND regexp_matches(pre,'Enviado por\\s*$') THEN 1 ELSE 0 END) n_recibo,
   avg(CASE WHEN regexp_matches(pre||' '||post,'(?i)delegad[oa]|procurador[a]? da rep|procurador[a]?-geral|subprocurador|ministr[oa] |desembargador|juiz|juíza|escrivã|agente de pol|perito|auditor|analista tribut|servidor|\\bAPF\\b|\\bEPF\\b|\\bDPF\\b|\\bPCF\\b|pol[íi]cia federal') THEN 1 ELSE 0 END) p_aut
   FROM allm GROUP BY 1""")
c.execute("""CREATE TABLE roles AS SELECT entity,
   coalesce(r0.p_oab,0) p_oab, coalesce(r0.n_oab,0) n_oab, coalesce(r0.n_recibo,0) n_recibo, coalesce(r0.p_aut,0) p_aut, coalesce(sg.cob_max,0) cob_max,
   max(empresa::INT) empresa FROM nm LEFT JOIN roles0 r0 USING(entity) LEFT JOIN sig sg USING(entity) GROUP BY 1,2,3,4,5,6""")
import os, csv
c.execute("CREATE TABLE ov (entity VARCHAR, papel VARCHAR)"); rows_ov=[]
ovp=f"{W}/roles_override.csv"
if os.path.exists(ovp):
    with open(ovp,encoding="utf-8") as f: rows_ov=[(r["entity"].strip(),r["papel"].strip()) for r in csv.DictReader(f) if r.get("entity")]
    if rows_ov: c.executemany("INSERT INTO ov VALUES (?,?)",rows_ov)
c.execute("""CREATE TABLE nodes0 AS SELECT r.entity, CASE WHEN ov.papel IS NOT NULL THEN ov.papel WHEN r.empresa=1 THEN 'empresa' WHEN r.p_aut>=0.6 THEN 'autoridade' WHEN r.n_recibo>=1 OR r.n_oab>=2 OR r.p_oab>=0.30 THEN 'advogado' WHEN r.cob_max>=0.8 OR r.p_aut>=0.35 THEN 'autoridade' ELSE 'pessoa' END papel, round(r.p_oab,2) p_oab, r.n_oab, round(r.p_aut,2) p_aut, r.n_recibo, round(r.cob_max,2) cob_max FROM roles r LEFT JOIN ov ON ov.entity=r.entity""")
c.execute("CREATE TABLE nodes AS SELECT n.entity, r.papel, r.p_oab, r.n_oab, r.p_aut, r.n_recibo, r.cob_max, count(DISTINCT doc_id) docs, count(DISTINCT processo) procs, count(*) mentions, count(DISTINCT (doc_id,page)) pages FROM nm n JOIN nodes0 r USING(entity) GROUP BY 1,2,3,4,5,6,7")
GEN=r'^((DE|DA|DO|DAS|DOS|E|PARTICIPA[ÇC][ÕO]ES|EMPREENDIMENTOS|INVESTIMENTOS|VALORES|MOBILI[ÁA]RIOS|T[ÍI]TULOS|DISTRIBUIDORA|SOCIEDADE|UNIPESSOAL|HOLDING|CONSULTORIA|ASSET|CAPITAL|GEST[ÃA]O|SPE|SCD|FUNDO|BANCO|ADMINISTRADORA|CORRETORA|SEGURADORA|INCORPORADORA|CONSTRUTORA|SECURITIZADORA|FACTORING|COM[ÉE]RCIO|IND[ÚU]STRIA|SERVI[ÇC]OS|ASSESSORIA|EMPRESARIAL|LIMITADA|IMOBILI[ÁA]RIA|IMOBILI[ÁA]RIAS|NEG[ÓO]CIOS|GRUPO|COMPANHIA)\\s*)+$'
c.execute(f"DELETE FROM nodes WHERE papel='empresa' AND (regexp_matches(entity,'{GEN}') OR len(string_split(entity,' '))<2)")
c.execute("""CREATE TABLE edges AS SELECT a.entity src, b.entity dst, count(DISTINCT a.doc_id) docs, count(DISTINCT a.processo) procs, count(DISTINCT (a.doc_id,a.page)) pages
 FROM nm a JOIN nm b ON a.doc_id=b.doc_id AND a.page=b.page AND a.entity<b.entity GROUP BY 1,2 HAVING docs>=2""")
SURN=("SILVA","SANTOS","OLIVEIRA","SOUZA","SOUSA","RODRIGUES","FERREIRA","ALVES","PEREIRA","LIMA","GOMES","COSTA","RIBEIRO","MARTINS","CARVALHO","ALMEIDA","LOPES","SOARES","FERNANDES","VIEIRA","BARBOSA","ROCHA","DIAS","NASCIMENTO","ANDRADE","MOREIRA","NUNES","MARQUES","MACHADO","MENDES","FREITAS","CARDOSO","RAMOS","GONÇALVES","SANTANA","TEIXEIRA","ARAÚJO","ARAUJO","MONTEIRO","CORREA","CORRÊA","MORAES","MORAIS","BATISTA","BOTELHO","ROSENO","NETO","JÚNIOR","JUNIOR","FILHO","CAMPOS","CASTRO","PINTO","REIS","AZEVEDO","MELO","MIRANDA","CUNHA","BARROS","LEITE","GARCIA","FONSECA","VELOSO","BUENO","VORCARO","ZETTEL","MENDONÇA","TOFFOLI")
KEEP={r[0] for r in rows_ov} | set(ov_al.values()) if "ov_al" in dir() else {r[0] for r in rows_ov}   # curadoria manda: nome com papel atribuído ou alvo de apelido não é fragmento (DIAS TOFFOLI, NUNES MARQUES)
frag=[(v,) for v in canon if canon[v]==v and v not in KEEP and tokens(v) and tokens(v)[0] in SURN]
c.execute("CREATE TABLE frag (entity VARCHAR)"); c.executemany("INSERT INTO frag VALUES (?)",frag)
c.execute("DELETE FROM nodes WHERE papel<>'empresa' AND entity IN (SELECT entity FROM frag)")   # fragmento de sobrenome sem dono único: não é um nome
c.execute("DELETE FROM nodes WHERE papel='descartar'")
c.execute("DELETE FROM edges WHERE src NOT IN (SELECT entity FROM nodes) OR dst NOT IN (SELECT entity FROM nodes)")
c.execute(f"COPY nodes TO '{W}/corpus/graph_nodes.parquet' (FORMAT PARQUET)"); c.execute(f"COPY edges TO '{W}/corpus/graph_edges.parquet' (FORMAT PARQUET)")
c.execute(f"COPY canon TO '{W}/corpus/graph_aliases.parquet' (FORMAT PARQUET)")
print("nos:",c.sql("SELECT count(*) FROM nodes").fetchone()[0],"| arestas:",c.sql("SELECT count(*) FROM edges").fetchone()[0],"| apelidos:",sum(1 for k,v in canon.items() if k!=v))
print("\n=== apelidos (amostra):"); print(c.sql("SELECT canon, string_agg(value,' | ') variantes FROM canon WHERE value<>canon GROUP BY 1 ORDER BY count(*) DESC LIMIT 12").df().to_string(index=False))
print("\n=== papeis:"); print(c.sql("SELECT papel, count(*) n FROM nodes GROUP BY 1 ORDER BY n DESC").df().to_string(index=False))
print("\n=== nos centrais SEM advogados (grau = soma de docs das arestas):"); print(c.sql("""SELECT n.entity, n.papel, n.procs, n.docs, n.mentions, sum(x.docs) grau, count(*) vizinhos FROM nodes n JOIN (SELECT src entity, docs FROM edges UNION ALL SELECT dst, docs FROM edges) x USING(entity) WHERE n.papel<>'advogado' GROUP BY 1,2,3,4,5 ORDER BY grau DESC LIMIT 30""").df().to_string(index=False))
print("\n=== diagnostico clique:"); print(c.sql("SELECT entity, papel, p_oab, n_oab, n_recibo, p_aut, cob_max, docs FROM nodes WHERE entity IN ('IGOR SANT ANNA TAMASAUSKAS','MARIA ELIZABETH QUEIJO','ROBERTO PODVAL','BRUNO LESCHER FACCIOLLA','CAIO MOUSINHO HITA','DANIEL BUENO VORCARO','HENRIQUE SOUZA','SILVA PERETTO')").df().to_string(index=False))
print("\n=== advogados mais presentes:"); print(c.sql("SELECT entity, procs, docs, n_oab, n_recibo FROM nodes WHERE papel='advogado' ORDER BY docs DESC LIMIT 14").df().to_string(index=False))
print("\n=== autoridades mais presentes:"); print(c.sql("SELECT entity, procs, docs, p_aut, cob_max FROM nodes WHERE papel='autoridade' ORDER BY docs DESC LIMIT 14").df().to_string(index=False))
print("\n=== empresas mais presentes:"); print(c.sql("SELECT entity, procs, docs FROM nodes WHERE papel='empresa' ORDER BY docs DESC LIMIT 15").df().to_string(index=False))
print("\n=== arestas mais fortes entre nao-advogados:"); print(c.sql("SELECT e.src, e.dst, e.docs, e.procs FROM edges e JOIN nodes a ON a.entity=e.src JOIN nodes b ON b.entity=e.dst WHERE a.papel<>'advogado' AND b.papel<>'advogado' ORDER BY e.docs DESC, e.pages DESC LIMIT 30").df().to_string(index=False))
