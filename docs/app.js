/* autos-abertos — app estático. Sem backend, sem rastreamento. */
(async function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt=n=>Number(n).toLocaleString("pt-BR");
const ROLE_LABEL={pessoa:"pessoa",empresa:"empresa",autoridade:"autoridade",advogado:"advogado",pseudo:"pseudonimizado"};
const ROLE_PL={pessoa:"Pessoas",empresa:"Empresas",autoridade:"Autoridades",advogado:"Advogados",pseudo:"Pseudonimizados"};
const TIPO={"Decisao monocratica":"Decisão monocrática","Peticao":"Petição","Peticao inicial":"Petição inicial","Despacho":"Despacho","Busca e apreensao":"Peça sobre busca e apreensão","Prisao preventiva":"Peça sobre prisão preventiva","Inquerito":"Peça do inquérito","Sequestro":"Peça sobre bloqueio de bens (sequestro judicial)","Manifestacao":"Manifestação","Manifestacao da PGR":"Manifestação da PGR","Outras pecas":"Outras peças","Vista a PGR":"Vista à PGR","Mandado":"Mandado judicial","Restituicao de coisas apreendidas":"Pedido de devolução de bens apreendidos","Certidao de julgamento":"Certidão de julgamento","Documentos comprobatorios":"Documentos comprobatórios","Documento comprobatorio":"Documento comprobatório","Recibo de peticao eletronica":"Recibo de petição eletrônica","Comunicacao assinada":"Comunicação assinada","Procuracao":"Procuração","Intimacao":"Intimação","Certidao":"Certidão","Mandado de intimacao":"Mandado de intimação","Documentos de identificacao":"Documentos de identificação","Malote Digital":"Malote digital","Termo de disponibilizacao de autos":"Termo de disponibilização","Aviso de recebimento":"Aviso de recebimento"};
const tipo=t=>TIPO[t]||t;
const STF="https://noticias.stf.jus.br/postsnoticias/nota-a-imprensa-47/";
const COMM=["#FF2E97","#19E3FF","#FFD166","#B983FF","#FF8C42","#3DF2A0","#FF5C7A","#7FDBFF","#F7A8B8","#C3F73A","#FFB4E6","#8AFFC1","#FF9D5C","#9DB4FF","#E2B4FF","#5CE1FF"];

/* ---------- tema ---------- */
const root=document.documentElement;
try{const t=localStorage.getItem("bmdb.theme"); if(t) root.dataset.theme=t;}catch(e){}
const isDark=()=>root.dataset.theme!=="light";
function themeBtn(){$("#themeBtn").textContent=isDark()?"☀":"☾";}
themeBtn();
$("#themeBtn").onclick=()=>{root.dataset.theme=isDark()?"light":"dark";try{localStorage.setItem("bmdb.theme",root.dataset.theme)}catch(e){};themeBtn();drawTL();};

/* ---------- dados ---------- */
const load=async f=>(await fetch("data/"+f)).json();
const [NODES,ENT,PROCS,XREF,TL,CNPJS,META,WIKI]=await Promise.all(["nodes.json","entities.json","processos.json","crossrefs.json","timeline.json","cnpjs.json","meta.json","wiki.json"].map(load));
const G={nodes:NODES};   /* os nomes e sua presença nas peças */
const byId=new Map(G.nodes.map(n=>[n.id,n]));
const byLabel=new Map(G.nodes.map(n=>[n.label,n]));
const roleOf=n=>n.vis?n.papel:"pseudo";
function openNode(id){ if(typeof wkBy!=="undefined"&&wkBy.has(id)) openWiki(id); }   /* abre a ficha do personagem, se houver */
const colorOf=n=>css("--"+roleOf(n));

/* ---------- roteador ---------- */
const views=["inicio","personagens","processos","tempo","cronicas","busca","decisoes","decisao","metodo","avisos"];
let pendingQS=null;
function show(v){ v=v||""; if(v.includes("?")){ const i=v.indexOf("?"); pendingQS=v.slice(i+1); v=v.slice(0,i); if(v!=="cronicas") history.replaceState(null,"","#"+v); } if(!views.includes(v)) v="inicio";
  views.forEach(x=>{$("#v-"+x).hidden=(x!==v)});
  $$("[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===v));
  if(v==="personagens"){ if(pendingQS){ const q=new URLSearchParams(pendingQS); if(q.get("p")) WK.open=q.get("p"); pendingQS=null; } renderWiki(); }
  if(v==="busca") iniciaBusca();
  if(v==="decisao"){ if(pendingQS){ const q=new URLSearchParams(pendingQS); pendingQS=null; if(q.get("d")) abreDecisao(q.get("d"),q.get("p")||1); } else if(DEC.atual) renderDecisao(); }
  if(v==="decisoes") renderDecisoes();
  if(v==="cronicas"){ renderCronicas(pendingQS); pendingQS=null; }
  window.scrollTo({top:0});
}
addEventListener("hashchange",()=>show(location.hash.slice(1)));
$$(".tb-toggle").forEach(b=>b.onclick=()=>{const t=b.closest(".toolbar"); t.classList.toggle("open"); b.textContent=t.classList.contains("open")?"Menos filtros ▴":"Filtros ▾";});
$$("[data-nav]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();location.hash=a.dataset.nav;}));

/* ---------- início ---------- */
$("#tiles").innerHTML=[[META.corpus.paginas,"páginas"],[META.corpus.pdfs,"peças (PDF)"],[META.corpus.processos.length,"processos"],[G.nodes.filter(n=>n.vis).length,"nomes com ficha ou citação"]].map(([b,s])=>`<div class="tile"><b>${fmt(b)}</b><span>${s}</span></div>`).join("");
$("#buildInfo").textContent=`Dados gerados em ${META.gerado_em}. Pacote de origem: ${META.fonte.pacote}, ${fmt(META.fonte.bytes)} bytes, modificado em ${META.fonte.last_modified}.`;

function spark(tl){const ks=Object.keys(tl).sort(); if(ks.length<2) return ""; const vals=ks.map(k=>tl[k]); const mx=Math.max(...vals); const W=320,H=46; const pts=ks.map((k,i)=>`${(i/(ks.length-1))*W},${H-2-(tl[k]/mx)*(H-6)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="${css("--cyan")}" stroke-width="1.5" points="${pts}"/></svg><div class="muted" style="display:flex;justify-content:space-between;font-size:11px"><span>${ks[0]}</span><span>datas citadas junto ao nome</span><span>${ks[ks.length-1]}</span></div>`;}
function attachSearch(input,list,onPick){ let hl=-1;
  const suggest=q=>{ q=q.trim().toLowerCase(); if(!q){list.hidden=true;return;} const m=G.nodes.filter(n=>n.vis&&n.label.toLowerCase().includes(q)).sort((a,b)=>b.docs-a.docs).slice(0,9);
    list.innerHTML=m.map(n=>`<li data-id="${n.id}"><i class="badge" style="--c:var(--${roleOf(n)});padding:0;width:8px;height:8px;border-radius:50%"></i>${n.label}<span class="muted">${n.docs} peças</span></li>`).join(""); list.hidden=!m.length; hl=-1;
    $$("li",list).forEach(li=>li.onclick=()=>{list.hidden=true;input.value=byId.get(li.dataset.id).label;onPick(li.dataset.id);}); };
  input.oninput=()=>suggest(input.value);
  input.onkeydown=e=>{const li=$$("li",list); if(e.key==="ArrowDown"){hl=Math.min(hl+1,li.length-1);} else if(e.key==="ArrowUp"){hl=Math.max(hl-1,0);} else if(e.key==="Enter"){e.preventDefault(); if(li[Math.max(hl,0)]) li[Math.max(hl,0)].click(); else {const ex=G.nodes.find(n=>n.label.toLowerCase()===input.value.trim().toLowerCase()); if(ex) onPick(ex.id);} return;} else if(e.key==="Escape"){list.hidden=true;return;} else return; li.forEach((l,i)=>l.classList.toggle("hl",i===hl));};
  document.addEventListener("click",e=>{if(!e.target.closest(".search")) list.hidden=true;});
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* ---------- processos (v2: tabela ordenável, detalhe, matriz de citações) ---------- */
const TIPO_COLORS=["#35D8F0","#FF4FA3","#B08CFF","#FFD37A","#4FE3A6","#FF9A5C","#FF6B86","#7FB2FF","#C3F73A","#9DB4FF"];
const tipoOrder=Object.entries(PROCS.reduce((m,p)=>{Object.entries(p.tipos).forEach(([t,n])=>m[t]=(m[t]||0)+n);return m;},{})).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
const tipoColor=t=>{const i=tipoOrder.indexOf(t); return i>=0&&i<TIPO_COLORS.length?TIPO_COLORS[i]:"var(--pseudo)";};
/* a legenda de tipos de peça vive agora na linha do tempo */
const PS={sort:"crono"};
const kind=p=>p.startsWith("INQ")?"inquérito":p.startsWith("RCL")?"reclamação":"petição";
/* ---------- processos: a história de cada um, e o rastro em linguagem natural ---------- */
let RASTRO=null, RESUMOS=null, EXC=null;
async function loadPR(){ if(!RASTRO){ [RASTRO,RESUMOS,EXC]=await Promise.all([load("rastro.json"),load("resumos.json"),load("excertos.json")]); await loadDecIdx(); } }
/* excertos: o texto do ato do juízo, recortado pelo pipeline a partir da peça, nunca digitado */
function excId(proc,x){ return "exc-"+proc.replace(/\s+/g,"")+"-"+x.s+"-"+x.p; }
function excCard(proc,x){ const dt=x.d?dataLonga(x.d):""; const ents=(x.ents||[]).map(l=>byLabel.get(l)).filter(Boolean)
    .map(n=>`<button class="lnk" data-open="${esc(n.id)}" style="--c:var(--${roleOf(n)})"><i></i>${esc(n.label)}</button>`).join(" ");
  return `<figure class="exc" id="${excId(proc,x)}"><figcaption><b>${esc(x.t)}</b><span class="exc-src">${proc} · seq ${String(x.s).padStart(5,"0")} · p. ${x.p}${dt?" · "+dt:""}</span></figcaption>
    <blockquote>${esc(x.x)}</blockquote>
    ${x.c?`<p class="exc-ctx">${esc(x.c)}</p>`:""}
    <p class="exc-ler">${(DECIDX||[]).some(d=>d.f===decSlug(proc,x.s))?`<button class="lnk" data-dec-abrir="${decSlug(proc,x.s)}" data-dec-pag="${x.p}">ler a peça inteira, na página ${x.p}</button>`:`<span class="muted small">peça não publicada na íntegra neste site (não é ato decisório); conferir no pacote do STF</span>`}</p>
    ${ents?`<p class="exc-ents">${ents}</p>`:""}</figure>`; }
function excDe(proc){ return (EXC&&EXC[proc])||[]; }
function excDaEntidade(label){ const out=[]; if(!EXC) return out; for(const p in EXC) EXC[p].forEach(x=>{ if((x.ents||[]).includes(label)) out.push([p,x]); }); return out; }
/* os rótulos vêm do índice do STF, sem acento; devolvemos os acentos das palavras frequentes */
const ACC={Oficio:"Ofício",OFICIO:"OFÍCIO",Informacoes:"Informações",Servicos:"Serviços",Participacoes:"Participações",Titulos:"Títulos",Mobiliarios:"Mobiliários",Credito:"Crédito",Comissao:"Comissão",Agencia:"Agência",Aviacao:"Aviação",Policia:"Polícia",Uniao:"União",Judiciaria:"Judiciária",Secao:"Seção",Confederacao:"Confederação",Instituicao:"Instituição",Instituicoes:"Instituições",Balcao:"Balcão",Brasilia:"Brasília",Certidao:"Certidão",Intimacao:"Intimação",Decisao:"Decisão",Determinacao:"Determinação",Diligencias:"Diligências",Comunicacao:"Comunicação",Peticao:"Petição",Eletronico:"Eletrônico",Eletronica:"Eletrônica",Juizo:"Juízo",Publico:"Público",Ministerio:"Ministério",Ceara:"Ceará",Penitenciario:"Penitenciário",Transito:"Trânsito",Gerencia:"Gerência",Analise:"Análise",Prevencao:"Prevenção",Distribuicao:"Distribuição",Originarios:"Originários",Execucao:"Execução",Imoveis:"Imóveis",Sao:"São",Inclusao:"Inclusão",Restricao:"Restrição",Veicular:"Veicular",Valores:"Valores",Federacao:"Federação",Digitais:"Digitais",Inteligencia:"Inteligência",Financeira:"Financeira",Controle:"Controle",Atividades:"Atividades",Conselho:"Conselho",Receita:"Receita",Senado:"Senado",Vara:"Vara",Regiao:"Região",Nacional:"Nacional",Cooperativa:"Cooperativa",Cooperativas:"Cooperativas",Empresarial:"Empresarial",Unipessoal:"Unipessoal",Corretora:"Corretora",Distribuidora:"Distribuidora",Pagamentos:"Pagamentos",Retificacao:"Retificação",Autuacao:"Autuação",Manifestacao:"Manifestação",Remessa:"Remessa",Situacao:"Situação",Resposta:"Resposta",Comprovante:"Comprovante",Mandado:"Mandado",Relator:"Relator"};
const acentua=s=>s.replace(/[A-Za-zÀ-ÿ]+/g,w=>ACC[w]||w);
/* "Oficio n. 114 - CVM" → "a CVM": quem respondeu, sem o número do expediente */
function orgDe(st){
  let s=st.replace(/^.*?\s-\s/,"").replace(/^(OFICIO|Oficio|Of\.)\s*(N\.|n\.|nº)?\s*/,"").replace(/^(Informacoes|Informações)\s+(d[aoe]s?\s+)?/i,"").replace(/^(Resposta|Comprovante)\b.*$/i,"").trim();
  s=s.replace(/^d[aoe]s?\s+/i,"").replace(/\s*\(.*\)$/,"").trim();
  s=s.replace(/^[^A-Za-zÀ-ÿ]+/,"").trim();
  if((s.match(/[A-Za-zÀ-ÿ]/g)||[]).length<3) return "";
  return acentua(s);
}
const MES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const dataLonga=d=>{const[y,m,x]=d.split("-");return `${+x} de ${MES[+m-1]} de ${y}`;};
const mesDe=d=>{const[y,m]=d.split("-");return `${MES[+m-1]} de ${y}`;};
/* cada peça vira uma frase; peças iguais e seguidas no mesmo dia viram uma linha só */
function frase(e){
  const st=e.st||"", t=e.t, a=e.a;
  const has=r=>new RegExp(r,"i").test(st);
  if(t==="Peticao inicial") return a==="pf"?["a Polícia Federal apresenta a representação","representações da Polícia Federal"]
    :a==="pgr"?["a Procuradoria-Geral da República apresenta manifestação","manifestações da Procuradoria"]
    :a==="def"?["uma defesa apresenta petição inicial","petições iniciais de defesas"]
    :a==="bcb"?["o Banco Central apresenta informações","informações do Banco Central"]:["petição inicial","petições iniciais"];
  if(t==="Decisao monocratica") return has("Liminar")?["o relator aprecia um pedido liminar","decisões liminares"]
    :has("Final")?["o relator profere decisão final","decisões finais"]:["o relator decide","decisões do relator"];
  if(t==="Despacho") return ["o relator despacha","despachos do relator"];
  if(t==="Vista a PGR") return ["os autos vão à Procuradoria-Geral da República","remessas à Procuradoria"];
  if(t==="Manifestacao da PGR"||t==="Manifestacao") return ["a Procuradoria-Geral da República se manifesta","manifestações da Procuradoria"];
  if(t==="Peticao") {
    if(a==="pf") return ["a Polícia Federal peticiona","petições da Polícia Federal"];
    if(a==="pgr") return ["a Procuradoria-Geral da República se manifesta","manifestações da Procuradoria"];
    if(a==="bcb") return ["o Banco Central responde","respostas do Banco Central"];
    if(a==="resp"){ const o=orgDe(st); return [o?`${o} responde ao ofício`:"um ofício é respondido","respostas a ofícios"]; }
    if(a==="def") return ["uma defesa peticiona","petições de defesas"];
    return [st?`junta-se aos autos: ${acentua(st).toLowerCase()}`:"petição juntada aos autos","petições juntadas"];
  }
  if(t==="Comunicacao assinada"){
    if(has("Determinacao de diligencias")) return ["ofício do relator determinando diligências","ofícios do relator determinando diligências"];
    if(has("Busca e Apreensao")) return ["mandado de busca e apreensão expedido","mandados de busca e apreensão expedidos"];
    if(has("Prisao")) return ["mandado de prisão expedido","mandados de prisão expedidos"];
    if(has("intimacao|Intimacao")) return ["mandado de intimação expedido","mandados de intimação expedidos"];
    if(has("Comunica|Comunicacao de despacho")) return ["ofício comunicando a decisão","ofícios comunicando a decisão"];
    if(has("CERTIDAO|Certidao")) return ["certidão nos autos","certidões nos autos"];
    return ["comunicação assinada pelo relator","comunicações assinadas pelo relator"];
  }
  if(t==="Certidao"||t==="Certidao de retificacao de autuacao"||t==="Certidao de Intimacao"||t==="Certidao de transito em julgado"){
    if(has("distribuicao")) return ["o processo é distribuído ao relator","certidões de distribuição"];
    if(has("ausencia de manifestacao")) return ["a secretaria certifica que o prazo passou sem manifestação","certidões de prazo vencido"];
    if(has("retificacao")) return ["a autuação é retificada","retificações de autuação"];
    if(has("transito")) return ["a decisão transita em julgado","certidões de trânsito em julgado"];
    return ["a secretaria certifica um ato","certidões da secretaria"];
  }
  if(t==="Certidao de julgamento") return ["certidão de julgamento do colegiado","certidões de julgamento"];
  if(t==="Intimacao"||t==="Mandado de intimacao") return ["intimação expedida","intimações expedidas"];
  if(t==="Mandado") return ["mandado expedido","mandados expedidos"];
  if(t==="Busca e apreensao") return ["auto de busca e apreensão juntado","autos de busca e apreensão"];
  if(t==="Prisao preventiva") return ["peça de prisão preventiva juntada","peças de prisão preventiva"];
  if(t==="Sequestro") return ["peça de sequestro de bens juntada","peças de sequestro de bens"];
  if(t==="Restituicao de coisas apreendidas") return ["pedido de restituição de coisas apreendidas","pedidos de restituição"];
  if(t==="Termo de disponibilizacao de autos") return ["os autos são disponibilizados à autoridade policial","termos de disponibilização dos autos"];
  if(t==="Malote Digital") return ["comunicação de outro juízo","comunicações de outros juízos"];
  if(t==="Inquerito") return ["peça do inquérito juntada","peças do inquérito"];
  if(t==="Informacao") return ["informação juntada aos autos","informações juntadas"];
  if(t==="Pedido de reconsideracao") return ["pedido de reconsideração","pedidos de reconsideração"];
  if(t==="Peticao de apresentacao de defesa") return ["apresentação de defesa","apresentações de defesa"];
  if(t==="Pedido de ingresso como interessado") return ["pedido de ingresso como interessado","pedidos de ingresso"];
  if(t==="Peticao de juntada de documentos") return ["pedido de juntada de documentos","pedidos de juntada"];
  if(t.indexOf("acordao")>=0||t==="Acordao") return ["acórdão publicado","acórdãos publicados"];
  return [tipo(t).toLowerCase()+" juntado",tipo(t).toLowerCase()];
}
const PESO={"Decisao monocratica":3,"Peticao inicial":3,"Acordao":3,"Despacho":1,"Vista a PGR":1};
function rastroHTML(proc,marcos){
  const comDec=new Set((DECIDX||[]).filter(x=>x.proc===proc).map(x=>x.s));
  const comExc=new Map(); excDe(proc).forEach(x=>{ if(!comExc.has(x.s)) comExc.set(x.s,excId(proc,x)); });
  const r=(RASTRO[proc]||[]).filter(e=>e.d).slice().sort((a,b)=>a.d.localeCompare(b.d)||a.s-b.s);
  const mset=new Set(marcos.map(m=>m[0]));
  const linhas=[]; let i=0;
  while(i<r.length){
    const [sg,pl]=frase(r[i]); let j=i, pags=0, seqs=[];
    while(j<r.length && r[j].d===r[i].d && frase(r[j])[0]===sg){ pags+=r[j].p; seqs.push(r[j].s); j++; }
    const n=j-i, peso=PESO[r[i].t]||0;
    const txt=n>1?`${n} ${pl}`:sg;
    const pg=pags>=3?`${fmt(pags)} pág.`:"";
    const sq=seqs.length>1?`seq ${seqs[0]}–${seqs[seqs.length-1]}`:`seq ${seqs[0]}`;
    const alvo=seqs.map(x=>comExc.get(x)).find(Boolean);
    const dec=seqs.find(x=>comDec.has(x));
    linhas.push({d:r[i].d,txt,meta:[pg,sq].filter(Boolean).join(" · "),peso:peso+(mset.has(r[i].d)?2:0),exc:alvo||"",dec:dec!==undefined?decSlug(proc,dec):""});
    i=j;
  }
  let mes="", out="";
  linhas.forEach((l,k)=>{
    const m=mesDe(l.d); if(m!==mes){ mes=m; out+=`<h5 class="rt-mes">${m}</h5>`; }
    out+=`<div class="rt-l${l.peso>=3?" forte":""}" data-k="${k}"><span class="rt-d">${+l.d.split("-")[2]}</span><span class="rt-t">${l.txt}${l.exc?` <button class="rt-x" data-exc="${l.exc}">ler um trecho</button>`:""}${l.dec?` <button class="rt-x" data-dec-abrir="${l.dec}">ler a peça</button>`:""}</span><span class="rt-m">${l.meta}</span></div>`;
  });
  return {html:out,n:linhas.length};
}
function procCard(p){
  const R=RESUMOS[p.processo]||{t:"",o:"",r:[],m:[]};
  const per=periodo(p.processo);
  return `<button class="proc-card" data-p="${esc(p.processo)}"><div class="pc-h"><span class="pid">${p.processo}</span><span class="pc-t">${esc(R.t)}</span></div>
    <p class="pc-o">${esc(R.o)}</p><p class="pc-m">${per} · ${fmt(p.pdfs)} peças · ${fmt(p.pages)} páginas${excDe(p.processo).length?` · <b>${excDe(p.processo).length} excertos</b>`:""}</p></button>`;
}
function periodo(proc){ const r=(RASTRO[proc]||[]).filter(e=>e.d); if(!r.length) return ""; const ini=primeiraData(proc), fim=r.map(e=>e.d).sort().pop(); return `${mesDe(ini)} — ${mesDe(fim)}`; }
/* o começo do processo é a data da primeira peça dele (menor seq), não a data mais antiga citada num anexo */
function primeiraData(proc){ const r=(RASTRO[proc]||[]).filter(e=>e.d).slice().sort((a,b)=>a.s-b.s); return r.length?r[0].d:"9999"; }
async function renderProcs(){
  await loadPR();
  const rows=[...PROCS].sort((a,b)=>PS.sort==="pages"?b.pages-a.pages:primeiraData(a.processo).localeCompare(primeiraData(b.processo)));
  $("#procCards").innerHTML=rows.map(procCard).join("");
  $$("#procCards .proc-card").forEach(b=>b.onclick=()=>openProc(b.dataset.p));
}
function openProc(proc){
  const p=PROCS.find(x=>x.processo===proc), R=RESUMOS[proc]; if(!p||!R) return;
  const P=$("#procPage"), L=$("#procList");
  const {html,n}=rastroHTML(proc,R.m); const xs=excDe(proc);
  const marcos=R.m.map(([d,t])=>`<li><b>${dataLonga(d)}</b> — ${esc(t)}</li>`).join("");
  const tops=p.top.slice(0,8).map(([l,rl,c])=>{const id=byLabel.get(l)?.id; return `<button data-open="${id||""}" style="--c:var(--${id?roleOf(byId.get(id)):rl})"><i></i>${esc(l)} <span class="muted">${c}</span></button>`;}).join("");
  const serie=R.s?`<p class="pp-serie">Há uma série de crônicas sobre este processo. <button class="btn small" data-cr="${esc(R.s)}">Ler a série</button></p>`:"";
  const cita=(xg[proc]||[]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([d,c])=>`<button class="lnk" data-goproc="${esc(d)}">${d}</button> <span class="muted">(${c})</span>`).join(", ")||"—";
  document.title=`${proc} — autos-abertos`;
  P.innerHTML=`<button class="btn ghost small back" id="ppBack">← todos os processos</button>
    <p class="eyebrow">${proc} · ${esc(R.t)}</p><h2>${esc(R.o)}</h2>
    <div class="pp-num"><span>${periodo(proc)}</span><span><b>${fmt(p.pdfs)}</b> peças</span><span><b>${fmt(p.pages)}</b> páginas</span><span><b>${n}</b> movimentos</span></div>
    ${R.r.map(x=>`<p>${esc(x)}</p>`).join("")}
    ${serie}
    <h3>Os momentos que importam</h3><ul class="pp-marcos">${marcos}</ul>
    ${xs.length?`<h3>Nas palavras da decisão</h3><p class="muted small">Trechos literais dos atos assinados pelo relator e pela Procuradoria, recortados do próprio documento. Não citamos representação da polícia nem petição de defesa.</p><div class="excs">${xs.map(x=>excCard(proc,x)).join("")}</div>`:""}
    <h3>O rastro, dia a dia</h3>
    <p class="muted small">Cada linha é uma peça dos autos, descrita pelo que ela é. O <em>seq</em> é o número da peça no processo e o começo do nome do arquivo no pacote público do STF. Peças iguais no mesmo dia aparecem juntas.</p>
    <div class="rt-wrap" id="ppRastro">${html}</div>
    ${n>14?'<button class="btn ghost small" id="ppMais">mostrar o rastro inteiro</button>':""}
    <h3>Quem mais aparece</h3><div class="tops">${tops}</div>
    <p class="muted small" style="margin-top:6px">Contagem de peças narrativas em que o nome aparece. Aparecer muito não diz o que a pessoa fez.</p>
    <h3>Este processo cita</h3><p>${cita}</p>
    <div class="acts"><button class="btn ghost small" data-tl="${esc(proc)}">Linha do tempo</button></div>`;
  L.hidden=true; P.hidden=false; scrollTo({top:0,behavior:"instant"});
  const wrap=$("#ppRastro"); if(n>14) wrap.classList.add("curto");
  const mais=$("#ppMais"); if(mais) mais.onclick=()=>{wrap.classList.remove("curto");mais.remove();};
  $("#ppBack").onclick=()=>{P.hidden=true;L.hidden=false;};
  $$("[data-open]",P).forEach(b=>b.onclick=()=>{ if(b.dataset.open) openNode(b.dataset.open); });
  $$("[data-goproc]",P).forEach(b=>b.onclick=()=>openProc(b.dataset.goproc));
  $$("[data-dec-abrir]",P).forEach(b=>b.onclick=()=>abreDecisao(b.dataset.decAbrir,b.dataset.decPag||1));
  $$("[data-exc]",P).forEach(b=>b.onclick=()=>{ const el=$("#"+b.dataset.exc); if(!el) return; el.scrollIntoView({behavior:"smooth",block:"center"}); el.classList.add("pisca"); setTimeout(()=>el.classList.remove("pisca"),1600); });
  $$("[data-cr]",P).forEach(b=>b.onclick=()=>{location.hash="cronicas?p="+b.dataset.cr;});
  $$("[data-tl]",P).forEach(b=>b.onclick=()=>{ location.hash="tempo"; setTimeout(()=>{$("#tlProc").value=b.dataset.tl;drawTL();},60); });
}
$$("#procOrder .chip").forEach(c=>c.onclick=()=>{ $$("#procOrder .chip").forEach(x=>x.classList.toggle("on",x===c)); PS.sort=c.dataset.ord==="pages"?"pages":"crono"; renderProcs(); });
const xg={}; XREF.forEach(({s,d,n})=>{(xg[s]=xg[s]||[]).push([d,n]);});
(function xrefMatrix(){ const ps=META.corpus.processos; const M={}; XREF.forEach(({s,d,n})=>{M[s+"|"+d]=n;}); const mx=Math.max(1,...XREF.map(x=>x.n));
  $("#xrefMatrix").innerHTML=`<tr><th></th>${ps.map(p=>`<th class="rot">${p}</th>`).join("")}</tr>`+ps.map(r=>`<tr><th>${r}</th>${ps.map(c=>{ if(r===c) return `<td class="self">·</td>`; const n=M[r+"|"+c]||0; const a=n?0.12+0.88*Math.sqrt(n/mx):0; return `<td title="${r} cita ${c}: ${n} peças" style="background:color-mix(in srgb,var(--pink) ${Math.round(a*100)}%,var(--bg2));color:${a>.5?"#fff":"var(--ink)"}">${n||""}</td>`;}).join("")}</tr>`).join("");
})();
renderProcs();

/* ---------- linha do tempo ---------- */
const tlProc=$("#tlProc"); META.corpus.processos.forEach(p=>tlProc.insertAdjacentHTML("beforeend",`<option>${p}</option>`));
function months(){const out=[]; const y0=innerWidth<640?2023:2015; for(let y=y0;y<=2026;y++) for(let m=1;m<=12;m++){const k=`${y}-${String(m).padStart(2,"0")}`; if(k>"2026-09") break; out.push(k);} return out;}
const PCOL={}; META.corpus.processos.forEach((p,i)=>PCOL[p]=COMM[i%COMM.length]);
$("#tlLegend").innerHTML=META.corpus.processos.map(p=>`<span><i style="background:${PCOL[p]}"></i>${p}</span>`).join("");
let tlSel=null;
function drawTL(){ const ms=months(), proc=tlProc.value, log=$("#tlLog").checked, stack=$("#tlStack").checked&&!proc;
  const val=ms.map(k=>{const d=TL[k]||{}; return proc?(d[proc]||0):Object.values(d).reduce((a,b)=>a+b,0);});
  const tr=v=>log?Math.log10(v+1):v; const mx=Math.max(1,...val.map(tr)); const W=1400,H=320,pad=30,bw=(W-pad*2)/ms.length; const ps=META.corpus.processos;
  const inS=k=>!!tlSel&&k>=tlSel[0]&&k<=tlSel[1]; const cls=k=>tlSel?(inS(k)?"sel":"out"):"";
  const bars=ms.map((k,i)=>{ const x=pad+i*bw+1, w=bw-2;
    if(stack){ const d=TL[k]||{}; const tot=val[i]||1; const h=(tr(val[i])/mx)*(H-60); let y=H-40; const parts=ps.map(p=>[p,d[p]||0]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]); return `<g class="${cls(k)}" data-k="${k}">${parts.map(([p,v])=>{const hh=h*(v/tot); y-=hh; return `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${PCOL[p]}"></rect>`;}).join("")}</g>`; }
    const h=(tr(val[i])/mx)*(H-60); return `<rect class="${cls(k)}" x="${x}" y="${H-40-h}" width="${w}" height="${h}" fill="url(#tlg)" data-k="${k}"></rect>`; });
  $("#tlChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="touch-action:none"><defs><linearGradient id="tlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${css("--pink")}"/><stop offset="1" stop-color="${css("--cyan")}"/></linearGradient></defs>${bars.join("")}${ms.map((k,i)=>k.endsWith("-01")?`<text x="${pad+i*bw}" y="${H-22}" font-size="11" fill="${css("--muted")}">${k.slice(0,4)}</text>`:"").join("")}</svg>`;
  const svg=$("#tlChart svg"); let down=null; const kAt=e=>{const t=e.target.closest("[data-k]"); return t?t.dataset.k:null;};
  function paintSel(){ $$("[data-k]",svg).forEach(el=>{ const k=el.dataset.k; el.classList.toggle("sel",inS(k)); el.classList.toggle("out",!!tlSel&&!inS(k)); }); }
  function brushInfo(){ const B=$("#tlBrush"); if(!tlSel){B.hidden=true;return;} const [a,b]=tlSel; let tot=0; const pp={}; ms.filter(k=>k>=a&&k<=b).forEach(k=>{const d=TL[k]||{}; Object.entries(d).forEach(([p,v])=>{ if(!proc||p===proc){ tot+=v; pp[p]=(pp[p]||0)+v; } });}); const top=Object.entries(pp).sort((x,y)=>y[1]-x[1]).slice(0,4);
    B.innerHTML=`<b>${a} a ${b}</b> · ${fmt(tot)} datas citadas · ${top.map(([p,n])=>`<span style="color:${PCOL[p]}">${p}</span> (${fmt(n)})`).join(", ")} <button class="btn ghost small" id="tlClear">limpar</button>`; B.hidden=false;
    $("#tlClear").onclick=()=>{ tlSel=null; paintSel(); brushInfo(); }; }
  svg.onpointerdown=e=>{ const k=kAt(e); if(!k) return; down=k; tlSel=[k,k]; paintSel(); e.preventDefault(); };
  svg.onpointermove=e=>{ const k=kAt(e); if(down&&k){ tlSel=down<k?[down,k]:[k,down]; paintSel(); } if(k){ const d=TL[k]||{}; const top=Object.entries(d).sort((a,b)=>b[1]-a[1]).slice(0,5); $("#tlDetail").innerHTML=`<b>${k}</b> · ${fmt(val[ms.indexOf(k)])} datas citadas${top.length?" · "+top.map(([p,n])=>`<span style="color:${PCOL[p]}">${p}</span> (${fmt(n)})`).join(", "):""}`; } };
  svg.onpointerup=svg.onpointerleave=()=>{ if(!down) return; down=null; if(tlSel&&tlSel[0]===tlSel[1]) tlSel=null; paintSel(); brushInfo(); };
  paintSel(); brushInfo(); drawSmall(ms);
}
const TLE={ids:[]};
attachSearch($("#tlEnt"),$("#tlEntSugg"),id=>{ if(!TLE.ids.includes(id)&&TLE.ids.length<5) TLE.ids.push(id); $("#tlEnt").value=""; drawTL(); });
function drawSmall(ms){ $("#tlEntChips").innerHTML=TLE.ids.map(id=>`<button class="chip on x" data-rm="${esc(id)}" style="--c:var(--${roleOf(byId.get(id))})"><i></i>${esc(byId.get(id).label)}</button>`).join(""); $$("[data-rm]",$("#tlEntChips")).forEach(b=>b.onclick=()=>{TLE.ids=TLE.ids.filter(x=>x!==b.dataset.rm);drawTL();});
  const S=$("#tlSmall"); if(!TLE.ids.length){ S.innerHTML=`<p class="muted">Adicione até cinco personagens para comparar.</p>`; return; }
  const W=1400,H=54; S.innerHTML=TLE.ids.map(id=>{ const n=byId.get(id); const tl=(ENT[id]||{}).tl||{}; const v=ms.map(k=>tl[k]||0); const mx=Math.max(1,...v); const pk=ms[v.indexOf(mx)]; const pts=v.map((x,i)=>`${(i/(ms.length-1))*W},${H-2-(x/mx)*(H-6)}`); return `<div class="sm"><div class="nm" style="--c:var(--${roleOf(n)})"><i></i><span>${esc(n.label)}</span></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="M0,${H} L${pts.join(" L")} L${W},${H} Z" fill="${colorOf(n)}" fill-opacity=".22"/><polyline fill="none" stroke="${colorOf(n)}" stroke-width="1.5" points="${pts.join(" ")}"/></svg><div class="pk">pico ${pk}<br>${fmt(mx)} datas</div></div>`; }).join(""); }
tlProc.onchange=drawTL; $("#tlLog").onchange=drawTL; $("#tlStack").onchange=drawTL; drawTL();

/* ---------- personagens (fichas automáticas + curadoria de condição, biografia e âmbito) ---------- */
const WKT={back:"← todos os personagens",who:"Quem é nos autos",amb:"Em que condição aparece, por processo",fontes:"Fontes",atos:"Atos do juízo publicados que citam o nome",atosNone:"Nenhum ato do juízo publicado neste site cita o nome: as menções estão em petições, representações e anexos.",atosN:n=>`${n} ato${n>1?"s":""} do juízo`,atosLer:"ler o primeiro, na página",auto:"Dados automáticos: contagens sobre o texto das peças, sem leitura",kv:["peças","processos","menções"],pres:"Presença por processo",junto:"Divide páginas com (coocorrência na mesma página, não relação)",tipos:"Tipos de peça em que o nome aparece",onde:"Onde conferir",ondeNota:"Cada linha é uma peça dos autos em que o nome aparece, com a página. A coluna “tipo da peça” descreve o documento, não a pessoa ou empresa: um banco citado numa peça sobre bloqueio de bens é, em regra, o banco que recebeu a ordem, não o alvo dela. Só a leitura da página diz em que condição o nome aparece.",cols:["processo","seq","tipo da peça","pág."],semNo:"A extração automática não reconheceu este nome nas peças; esta ficha é só de curadoria, sem contagens.",aka:"Também grafado nos autos como",dec:"Citado nas decisões",decNota:"Trechos literais de atos do juízo em que este nome aparece. Ser citado numa decisão não conclui nada.",foot:"Ficha a partir dos dados públicos sanitizados, com curadoria de condição, biografia e âmbito. Coocorrência na mesma página não prova relação; investigado não é acusado; ninguém foi denunciado nos autos públicos. Erros: abra uma issue.",md:"Ficha em Markdown",nada:"Nada com esse filtro.",n:(d,p)=>`${d} peças · ${p} processos`,ndCard:"condição não apurada",roles:{pessoa:"Pessoas",empresa:"Empresas",autoridade:"Autoridades",advogado:"Advogados"},chipsAria:"Filtrar por condição nos autos",google:""};
const WK={conds:new Set(["investigado","autoridade","citado","oficiada","nd"]),q:"",open:null};
const WKC=["investigado","autoridade","citado","oficiada","defesa","nd"];   /* ordem dos filtros */
const CONDV={investigado:"--cinv",autoridade:"--caut",citado:"--ccit",oficiada:"--cofi",defesa:"--cdef",nd:"--cnd"};
const wkBy=new Map(WIKI.pages.map(p=>[p.id,p]));
const wkNorm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
function wkChips(){ const C=$("#wkChips"); C.setAttribute("aria-label",WKT.chipsAria);
  C.innerHTML=WKC.map(c=>`<button class="chip${WK.conds.has(c)?" on":""}" data-cond="${c}" style="--c:var(${CONDV[c]})"><i></i>${WIKI.meta.cond[c].t}</button>`).join("");
  $$("[data-cond]",C).forEach(b=>b.onclick=()=>{const c=b.dataset.cond; WK.conds.has(c)?WK.conds.delete(c):WK.conds.add(c); b.classList.toggle("on",WK.conds.has(c)); renderWiki();}); }
wkChips();
$("#wkSearch").oninput=e=>{WK.q=wkNorm(e.target.value.trim());renderWiki();};
function openWiki(id){ WK.open=id; location.hash="personagens"; setTimeout(renderWiki,30); }
const ctag=p=>`<span class="ctag" style="--cc:var(${CONDV[p.cond]})">${WIKI.meta.cond[p.cond].s}</span>`;
const goProc=pr=>`<button class="lnk mono" data-goproc3="${esc(pr)}">${esc(pr)}</button>`;
function wkCard(p,compact){ const txt=p.curado?(p.bio&&p.bio[0])||"":p.resumo; const na=Object.values(p.atos||{}).reduce((s,v)=>s+v[0],0);
  return `<div class="wk-card${compact?" compact":""}" data-wk="${esc(p.id)}" style="--c:var(--${p.papel})"><span class="badge" style="--c:var(--${p.papel})">${ROLE_LABEL[p.papel]}</span>${ctag(p)}<h3>${esc(p.label)}</h3>
    <div class="sub">${p.sub?esc(p.sub):(p.sem_no?"":WKT.n(p.docs,p.procs))}</div>${txt?`<p>${esc(txt)}</p>`:""}
    <div class="atos">${na?WKT.atosN(na):WKT.atosNone.split(":")[0]}${p.curado?"":" · "+WKT.ndCard}</div></div>`; }
function wkBind(root){ $$("[data-wk]",root).forEach(c=>c.onclick=()=>openWiki(c.dataset.wk));
  $$("[data-goproc3]",root).forEach(b=>b.onclick=e=>{ e.stopPropagation(); const pr=b.dataset.goproc3; location.hash="processos"; setTimeout(async()=>{ await loadPR(); openProc(pr); },80); });
  $$("[data-dec-abrir]",root).forEach(b=>b.onclick=()=>abreDecisao(b.dataset.decAbrir,b.dataset.decPag||1));
  $$("[data-open]",root).forEach(b=>b.onclick=()=>openNode(b.dataset.open)); }
async function renderWiki(){ const grid=$("#wkGrid"), pg=$("#wkPage"); await loadPR();
  const top=$("#wkTop");
  if(WK.open&&wkBy.has(WK.open)){ const p=wkBy.get(WK.open); const c=WIKI.meta.cond[p.cond]; grid.hidden=true; pg.hidden=false; if(top) top.hidden=true;
    const roleBlock=(r,t)=>p.byrole[r]?`<h4>${t}</h4><div class="neigh">${p.byrole[r].map(x=>`<button data-wk="${esc(x.id)}" style="--c:var(--${byId.get(x.id)?roleOf(byId.get(x.id)):r})"><i></i>${esc(x.label)}<span class="muted">${x.w}</span></button>`).join("")}</div>`:"";
    const atos=Object.entries(p.atos||{}).sort((a,b)=>b[1][0]-a[1][0]);
    const atosHTML=atos.length?`<ul class="wk-atos">${atos.map(([pr,[n,f,pag]])=>`<li>${goProc(pr)} · ${WKT.atosN(n)} · <button class="lnk" data-dec-abrir="${esc(f)}" data-dec-pag="${pag}">${WKT.atosLer} ${pag}</button></li>`).join("")}</ul>`:`<p class="muted small">${WKT.atosNone}</p>`;
    const curado=p.curado?`<div class="wk-bio"><h4>${WKT.who}</h4>${(p.bio||[]).map(x=>`<p>${esc(x)}</p>`).join("")}</div>
      ${(p.amb||[]).length?`<h4>${WKT.amb}</h4><ul class="wk-amb">${p.amb.map(([pr,t])=>`<li>${goProc(pr)}<span>${esc(t)}</span></li>`).join("")}</ul>`:""}
      ${p.fontes?`<p class="src">${WKT.fontes}: ${esc(p.fontes)}</p>`:""}`:"";
    const auto=p.sem_no?`<p class="muted small">${WKT.semNo}</p>`:`<details class="auto"${p.curado?"":" open"}><summary>${WKT.auto}</summary>
      <div class="kv" style="max-width:420px"><div><b>${fmt(p.docs)}</b><span>${WKT.kv[0]}</span></div><div><b>${p.procs}</b><span>${WKT.kv[1]}</span></div><div><b>${fmt(p.mentions)}</b><span>${WKT.kv[2]}</span></div></div>
      ${p.curado?"":`<p>${esc(p.resumo)}</p>`}
      <div class="wk-cols"><div><h4>${WKT.pres}</h4><div class="bars">${p.pe.slice(0,8).map(([pr,n])=>`<div class="bar"><span>${pr}</span><i style="width:${(n/Math.max(1,p.pe[0][1]))*100}%"></i><span>${n}</span></div>`).join("")}</div>${spark(p.tl||{})}
      ${p.cond==="oficiada"?"":`<h4 class="muted" style="margin-bottom:2px">${WKT.junto}</h4>${roleBlock("pessoa",WKT.roles.pessoa)}${roleBlock("empresa",WKT.roles.empresa)}${roleBlock("autoridade",WKT.roles.autoridade)}${roleBlock("advogado",WKT.roles.advogado)}`}</div>
      <div><h4>${WKT.tipos}</h4><ul>${p.tipos.map(([t,n])=>`<li>${tipo(t)} <span class="muted">(${n})</span></li>`).join("")}</ul>
      <h4>${WKT.onde}</h4><p class="muted small">${WKT.ondeNota}</p><table><tr>${WKT.cols.map(x=>`<th>${x}</th>`).join("")}</tr>${p.cit.map(([a,b,cc,d])=>`<tr><td>${a}</td><td>${String(b).padStart(5,"0")}</td><td>${tipo(cc)}</td><td>${d}</td></tr>`).join("")}</table></div></div></details>`;
    pg.innerHTML=`<button class="btn ghost small" id="wkBack">${WKT.back}</button><h2 style="margin-top:12px">${esc(p.label)}</h2><span class="badge" style="--c:var(--${p.papel})">${ROLE_LABEL[p.papel]}</span>${ctag(p)}
      ${p.sub?`<p class="wk-sub">${esc(p.sub)}</p>`:""}${p.aka&&p.aka.length?`<p class="muted small">${WKT.aka}: ${p.aka.map(esc).join(", ")}.</p>`:""}
      <div class="wk-cond" style="--cc:var(${CONDV[p.cond]})"><b>${c.t}.</b> ${c.d}</div>
      ${curado}
      <h4>${WKT.atos}</h4>${atosHTML}
      ${auto}
      ${(()=>{const xs=excDaEntidade(p.label); return xs.length?`<h4 style="margin-top:20px">${WKT.dec}</h4><p class="muted small">${WKT.decNota}</p><div class="excs">${xs.map(([pr,x])=>excCard(pr,x)).join("")}</div>`:"";})()}
      <div class="acts"><a class="btn ghost small" href="https://github.com/LLA-master/autos-abertos/blob/main/wiki/${p.slug}.md" target="_blank" rel="noopener">${WKT.md}</a>${WKT.google?`<a class="btn ghost small" href="https://www.google.com/search?q=${encodeURIComponent('"'+p.label+'" "Banco Master"')}" target="_blank" rel="noopener" title="Web search for this name; results are not part of the record">${WKT.google}</a>`:""}</div>
      <p class="muted" style="margin-top:12px">${WKT.foot}</p>`;
    $("#wkBack").onclick=()=>{WK.open=null;renderWiki();}; wkBind(pg);
    document.title=`${p.label} — autos-abertos`; window.scrollTo({top:0}); return; }
  pg.hidden=true; grid.hidden=false; if(top) top.hidden=false; document.title="autos-abertos — personagens";
  const ok=p=>WK.conds.has(p.cond)&&(!WK.q||wkNorm(p.label).includes(WK.q)||(p.aka||[]).some(a=>wkNorm(a).includes(WK.q)));
  let lastCond="";
  const secs=WIKI.meta.grupos.map(g=>{ const xs=WIKI.pages.filter(p=>p.grupo===g.g&&ok(p)); if(!xs.length) return "";
    const compact=["oficiadas","defesa","outros","citados"].includes(g.g); const def=g.cond!==lastCond?`<p class="def">${WIKI.meta.cond[g.cond].d}</p>`:""; lastCond=g.cond;
    return `<section class="wk-sec"><h3>${g.t} <span class="muted small">(${xs.length})</span></h3>${def}<div class="wk-grid${compact?" compact":""}">${xs.map(p=>wkCard(p,compact)).join("")}</div></section>`; }).join("");
  grid.innerHTML=secs||`<p class="muted">${WKT.nada}</p>`; wkBind(grid);
}
function dl(name,content,type){ const a=document.createElement("a"); a.href=type?URL.createObjectURL(new Blob([content],{type})):content; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
const lnk=(n,extra="")=>`<button class="lnk" data-open="${esc(n.id)}" style="--c:var(--${roleOf(n)})"><i></i>${esc(n.label)}</button>${extra}`;
/* ---------- crônicas (posts em Markdown, índice em posts/index.json) ---------- */
let CR=null; async function loadCR(){ if(!CR){ try{ CR=(await (await fetch("posts/index.json")).json()).posts; }catch(e){ CR=[]; } } return CR; }
const dateBR=d=>{ const [y,m,dd]=d.split("-"); return `${dd} de ${["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][+m-1]} de ${y}`; };
const procDoSlug=slug=>{ const m=/^(pet|inq|rcl)-(\d+)-/.exec(slug); return m?`${m[1].toUpperCase()} ${m[2]}`:null; };
function stripFM(md){ if(md.startsWith("---")){ const j=md.indexOf("\n---",3); if(j>0) return md.slice(j+4); } return md; }
async function renderCronicas(qs){ const posts=await loadCR(); const p=new URLSearchParams(qs||""); const slug=p.get("p"); const L=$("#crList"), P=$("#crPost");
  if(slug){ const i=posts.findIndex(x=>x.slug===slug); if(i>=0){ const post=posts[i]; L.hidden=true; P.hidden=false; P.innerHTML=`<p class="muted">Carregando…</p>`;
      let md=""; try{ const r=await fetch(`posts/${post.slug}.md`); if(!r.ok) throw new Error(r.status); md=stripFM(await r.text()); }catch(e){ md="*Não foi possível carregar o texto desta crônica.* Tente recarregar a página; se persistir, abra uma issue no repositório."; }
      const html=(window.marked?marked.parse(md):md.replace(/\n\n/g,"<br><br>"));
      const inS=post.serie?posts.filter(x=>x.serie===post.serie).sort((a,b)=>a.capitulo-b.capitulo):null; const si=inS?inS.findIndex(x=>x.slug===post.slug):-1;
      const prev=inS?inS[si-1]:posts[i+1], next=inS?inS[si+1]:posts[i-1];
      const eyebrow=post.serie?`${esc(post.serie)} · Capítulo ${post.capitulo} de ${inS.length} · ${dateBR(post.date)} · ${post.minutes} min`:`Crônica ${String(post.numero||posts.length-i).padStart(2,"0")} · ${dateBR(post.date)} · ${post.minutes} min de leitura`;
      P.innerHTML=`<button class="btn ghost small back" id="crBack">← todas as crônicas</button><p class="eyebrow">${eyebrow}</p><h1>${esc(post.title)}</h1><p class="sub">${esc(post.subtitle||"")}</p>
        <div class="meta">${(post.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}<span class="muted">Opinião do autor do projeto. Números e citações apontam para os dados públicos e para o acervo do STF.</span></div>
        <div class="cr-nota"><b>Nota de leitura.</b> Os fatos narrados aqui são os que constam de peças públicas dos autos: representações da Polícia Federal, manifestações do Ministério Público e decisões judiciais. Representação e denúncia são hipóteses de acusação, não conclusões; decisão cautelar é juízo provisório, tomado antes do contraditório. As peças publicadas são de fase de investigação: nenhuma é sentença. Nenhuma pessoa ou empresa citada é, por este texto, acusada de crime; todas têm presunção de inocência (Constituição, art. 5º, LVII). O que está entre aspas é citação da peça, atribuída à fonte; o resto é leitura do autor sobre esses documentos, sem apuração própria.</div>
        <div class="cr-body">${html}</div>
        <div class="cr-foot"><b>Isto é uma crônica.</b> Texto de opinião, separado da base de dados. O que é fato traz a fonte; o que é leitura é do autor. Coocorrência na mesma página não prova relação, e ninguém aqui é culpado de nada por aparecer numa ficha. Erros de fato: abra uma issue no repositório. Todos os avisos: <a href="#avisos" data-nav="avisos">Avisos e direitos</a>.
        ${(()=>{const pr=procDoSlug(post.slug); return pr?`<p class="cr-proc">Esta crônica é sobre o processo <b>${pr}</b>. <button class="btn small" data-goproc2="${pr}">Abrir a página do processo</button></p>`:"";})()}
        <div class="acts"><a class="btn small" href="#personagens" data-nav="personagens">Personagens</a><button class="btn ghost small" id="crShare">copiar link</button></div>
        <div class="cr-nav">${prev?`<a href="#cronicas?p=${prev.slug}"><span>${inS?"capítulo anterior":"anterior"}</span>${esc(prev.title)}</a>`:"<span></span>"}${next?`<a class="next" href="#cronicas?p=${next.slug}"><span>${inS?"próximo capítulo":"próxima"}</span>${esc(next.title)}</a>`:""}</div></div>`;
      $("#crBack").onclick=()=>{ location.hash="cronicas"; };
      $$("[data-goproc2]",P).forEach(b=>b.onclick=()=>{ const pr=b.dataset.goproc2; location.hash="processos"; setTimeout(async()=>{ await loadPR(); openProc(pr); },80); }); $$("[data-nav]",P).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();location.hash=a.dataset.nav;}));
      $("#crShare").onclick=async()=>{ const url=location.origin+location.pathname+`#cronicas?p=${post.slug}`; try{ await navigator.clipboard.writeText(url); $("#crShare").textContent="copiado ✓"; }catch(e){ prompt("Copie o link:",url); } setTimeout(()=>$("#crShare").textContent="copiar link",1500); };
      $$(".cr-body a[href^='#']",P).forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); location.hash=a.getAttribute("href").slice(1); }));
      document.title=`${post.title} — crônicas do autos-abertos`; window.scrollTo({top:0}); return; } }
  document.title="autos-abertos — crônicas"; P.hidden=true; L.hidden=false;
  const card=x=>`<a class="cr-card" href="#cronicas?p=${x.slug}"><span class="n">${x.serie?`CAPÍTULO ${x.capitulo}`:`CRÔNICA ${String(x.numero).padStart(2,"0")}`} · ${dateBR(x.date)}</span><h3>${esc(x.title)}</h3><p class="sub">${esc(x.subtitle||"")}</p><div class="m"><b>${x.minutes} min</b> · ${(x.tags||[]).join(" · ")}</div></a>`;
  const series=[...new Set(posts.filter(x=>x.serie).map(x=>x.serie))].sort((a,b)=>Math.min(...posts.filter(x=>x.serie===a).map(x=>x.numero))-Math.min(...posts.filter(x=>x.serie===b).map(x=>x.numero))); const solo=posts.filter(x=>!x.serie);
  $("#crCards").innerHTML=series.map(sname=>{const xs=posts.filter(x=>x.serie===sname).sort((a,b)=>a.capitulo-b.capitulo); return `<div class="cr-serie"><h3 class="cr-serie-t">${esc(sname)}</h3><p class="muted">${xs.length} capítulos · ${xs.reduce((s,x)=>s+x.minutes,0)} min no total. Cada capítulo cobre uma parte da decisão, na ordem em que ela mesma se organiza.</p><div class="cr-cards">${xs.map(card).join("")}</div></div>`;}).join("")+(solo.length?`<div class="cr-serie"><h3 class="cr-serie-t">Avulsas</h3><div class="cr-cards">${solo.map(card).join("")}</div></div>`:"")||`<p class="muted">Ainda sem crônicas.</p>`; }


/* ---------- lista das decisões na íntegra (só atos decisórios: decisões monocráticas, despachos e acórdãos) ---------- */
const DL={proc:"",tipo:""};
async function renderDecisoes(){
  const idx=await loadDecIdx(); const W=$("#dlWrap");
  const procs=[...new Set(idx.map(x=>x.proc))].sort(); const tipos=[...new Set(idx.map(x=>x.tipo))].sort((a,b)=>idx.filter(x=>x.tipo===b).length-idx.filter(x=>x.tipo===a).length);
  const xs=idx.filter(x=>(!DL.proc||x.proc===DL.proc)&&(!DL.tipo||x.tipo===DL.tipo)).sort((a,b)=>(b.d||"").localeCompare(a.d||"")||a.proc.localeCompare(b.proc)||a.s-b.s);
  const pags=xs.reduce((n,x)=>n+(x.p||0),0);
  W.innerHTML=`<div class="dl-bar"><select id="dlProc" aria-label="Processo"><option value="">todos os processos</option>${procs.map(p=>`<option value="${p}"${DL.proc===p?" selected":""}>${p}</option>`).join("")}</select>
    <div class="chips">${[["","todos os tipos"],...tipos.map(t=>[t,tipo(t)])].map(([v,l])=>`<button class="chip${DL.tipo===v?" on":""}" data-dlt="${v}">${esc(l)}</button>`).join("")}</div>
    <span class="muted small">${xs.length} atos · ${pags.toLocaleString("pt-BR")} páginas</span></div>
    <table class="dl-tab"><thead><tr><th>Data</th><th>Processo</th><th>Ato</th><th>Seq</th><th>Págs.</th></tr></thead><tbody>${xs.map(x=>`<tr><td>${x.d?dataLonga(x.d):"—"}</td><td>${esc(x.proc)}</td><td><button class="lnk" data-dec-abrir="${x.f}" data-dec-pag="1">${esc(tipo(x.tipo))}</button></td><td class="mono">${String(x.s).padStart(5,"0")}</td><td>${x.p}</td></tr>`).join("")}</tbody></table>`;
  $("#dlProc").onchange=e=>{ DL.proc=e.target.value; renderDecisoes(); };
  $$("[data-dlt]",W).forEach(b=>b.onclick=()=>{ DL.tipo=b.dataset.dlt; renderDecisoes(); });
  $$("[data-dec-abrir]",W).forEach(b=>b.onclick=()=>abreDecisao(b.dataset.decAbrir,1));
  document.title="autos-abertos — decisões na íntegra";
}

/* ---------- leitor das decisões: o texto integral do ato, com o dado pessoal mascarado ---------- */
let DECIDX=null; const DEC={atual:null,pag:1};
async function loadDecIdx(){ if(!DECIDX){ try{ DECIDX=await load("decisoes.json"); }catch(e){ DECIDX=[]; } } return DECIDX; }
const decSlug=(proc,seq)=>`${proc.replace(/\s+/g,"")}-${String(seq).padStart(5,"0")}`;
async function temDecisao(proc,seq){ await loadDecIdx(); const f=decSlug(proc,seq); return DECIDX.some(x=>x.f===f); }
async function abreDecisao(slug,pag){
  await loadDecIdx();
  const meta=DECIDX.find(x=>x.f===slug); if(!meta) return;
  let doc; try{ doc=await load(`decisoes/${slug}.json`); }catch(e){ return; }
  DEC.atual={meta,doc}; DEC.pag=Math.min(Math.max(1,+pag||1),doc.pags.length);
  location.hash="decisao"; setTimeout(renderDecisao,20);
}
function renderDecisao(){
  if(!DEC.atual) return; const {meta,doc}=DEC.atual, P=$("#dcPage");
  const total=doc.pags.length, i=DEC.pag;
  const nav=total>1?`<div class="dc-nav"><button class="btn ghost small" ${i<=1?"disabled":""} data-dc="${i-1}">← anterior</button>
    <span>página <b>${i}</b> de ${total}</span><button class="btn ghost small" ${i>=total?"disabled":""} data-dc="${i+1}">próxima →</button></div>`:"";
  const corpo=doc.pags[i-1].split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join("");
  P.innerHTML=`<button class="btn ghost small back" id="dcBack">← voltar ao processo</button> <a class="btn ghost small back" href="#decisoes" data-nav="decisoes">todas as decisões</a>
    <p class="eyebrow">${esc(doc.proc)} · seq ${String(doc.seq).padStart(5,"0")} · ${tipo(doc.tipo)}${doc.d?" · "+dataLonga(doc.d):""}</p>
    <h2>${esc(tipo(doc.tipo))}${doc.sub&&doc.sub!==doc.tipo?`: ${esc(acentua(doc.sub))}`:""}</h2>
    <p class="muted small">Texto integral da peça, como está nos autos públicos do STF. Nomes de vítimas, testemunhas e familiares, CPF, endereço, telefone, e-mail e dados de conta foram substituídos por etiquetas entre colchetes. Nada mais foi alterado.</p>
    ${nav}<div class="dc-txt">${corpo}</div>${nav}`;
  $("#dcBack").onclick=()=>{ location.hash="processos"; setTimeout(async()=>{ await loadPR(); openProc(doc.proc); },60); };
  $$("[data-dc]",P).forEach(b=>b.onclick=()=>{ DEC.pag=+b.dataset.dc; renderDecisao(); scrollTo({top:0,behavior:"instant"}); });
  $$("[data-nav]",P).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();location.hash=a.dataset.nav;}));
  document.title=`${doc.proc} seq ${doc.seq} — autos-abertos`;
  scrollTo({top:0,behavior:"instant"});
}

/* ---------- busca do site: BM25 sobre o índice invertido do estágio 10 ---------- */
let BS=null, bsTipo="", bsTimer=null;
const bsNorm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const bsTokens=s=>(bsNorm(s).match(/[a-z0-9][a-z0-9\-']{2,}/g)||[]);
async function iniciaBusca(){
  if(!BS){ $("#bsInfo").textContent="carregando o índice…"; BS=await load("busca.json"); $("#bsInfo").textContent=""; }
  const q=$("#bsQ"); if(!q.dataset.on){ q.dataset.on="1"; q.oninput=()=>{ clearTimeout(bsTimer); bsTimer=setTimeout(rodaBusca,120); }; q.onkeydown=e=>{ if(e.key==="Enter") rodaBusca(); };
    $$("#bsChips .chip").forEach(c=>c.onclick=()=>{ $$("#bsChips .chip").forEach(x=>x.classList.toggle("on",x===c)); bsTipo=c.dataset.bt; rodaBusca(); }); }
  q.focus(); if(q.value.trim()) rodaBusca();
}
function bm25(termos,orig){
  const N=BS.docs.length, k1=1.5, b=0.75, notas=new Map(), cobre=new Map();
  termos.forEach(t=>{
    const post=BS.idx[t]; if(!post) return;
    const idf=Math.log(1+(N-post.length+0.5)/(post.length+0.5));
    post.forEach(([i,f])=>{ const dl=BS.len[i]||1; const s=idf*(f*(k1+1))/(f+k1*(1-b+b*dl/BS.avg)); notas.set(i,(notas.get(i)||0)+s);
      if(orig.has(t)) cobre.set(i,(cobre.get(i)||new Set()).add(t)); });
  });
  /* quem tem todas as palavras da pergunta vem na frente de quem tem só uma */
  const nq=orig.size||1;
  notas.forEach((v,i)=>{ const c=(cobre.get(i)||new Set()).size; notas.set(i, v*Math.pow((c||0.4)/nq,2)); });
  return notas;
}
const BS_LABEL={excerto:"trecho",pagina:"decisão",cronica:"crônica",personagem:"personagem",processo:"processo",dossie:"dossiê"};
function rodaBusca(){
  const bruto=$("#bsQ").value.trim(); const O=$("#bsOut");
  if(!bruto){ O.innerHTML=""; $("#bsInfo").textContent=""; return; }
  const termos=bsTokens(bruto);
  /* prefixo: quem digita "vorcar" ainda não terminou de escrever "vorcaro" */
  const ult=termos[termos.length-1];
  const expandidos=[...termos];
  if(ult&&ult.length>=3&&!BS.idx[ult]) for(const t in BS.idx){ if(t.startsWith(ult)){ expandidos.push(t); if(expandidos.length>termos.length+12) break; } }
  const notas=bm25(expandidos,new Set(termos));
  /* o nome do documento vale mais do que uma menção no meio do texto */
  notas.forEach((v,i)=>{ const t=bsNorm(BS.docs[i].n); let boost=1;
    termos.forEach(x=>{ if(t.includes(x)) boost+=2.5; });
    if(bsNorm(BS.docs[i].n)===bsNorm(bruto)) boost+=4;
    notas.set(i,v*boost); });
  let res=[...notas.entries()].map(([i,n])=>({d:BS.docs[i],n})).filter(x=>!bsTipo||x.d.t===bsTipo).sort((a,b)=>b.n-a.n);
  const total=res.length; res=res.slice(0,40);
  $("#bsInfo").textContent=total?`${total} resultado${total>1?"s":""}${bsTipo?" em "+BS_LABEL[bsTipo]+"s":""}. Os mais próximos primeiro.`:"Nada com esses termos. Tente outra palavra, ou procure pelo nome como aparece nos autos.";
  const marca=s=>{ let h=esc(s); termos.forEach(t=>{ if(t.length<3) return; const re=new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");
      h=h.replace(new RegExp(`(?![^<]*>)${re.source}`,"ig"),"<mark>$1</mark>"); }); return h; };
  O.innerHTML=res.map(({d})=>`<button class="bs-r" data-h="${esc(d.h)}"><span class="bs-t">${BS_LABEL[d.t]||d.t}</span><b>${marca(d.n)}</b><span class="bs-s">${marca(d.s||"")}</span></button>`).join("");
  $$(".bs-r",O).forEach(b=>b.onclick=()=>abreResultado(b.dataset.h));
}
/* cada resultado leva ao lugar certo: processo, crônica, personagem */
function abreResultado(h){
  const [vista,qs]=h.split("?"); const p=new URLSearchParams(qs||"");
  /* o dossiê é página própria, fora do app: sai do SPA e cai na âncora do capítulo */
  if(/\.html(#|$)/.test(vista)){ location.href=vista; return; }
  if(vista==="processos"){ location.hash="processos"; setTimeout(async()=>{ await loadPR(); openProc(p.get("p")); const x=p.get("x"); if(x){ const el=$("#exc-"+p.get("p").replace(/\s+/g,"")+"-"+x.replace("-","-")); if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); el.classList.add("pisca"); setTimeout(()=>el.classList.remove("pisca"),1600); } } },80); return; }
  if(vista==="personagens"){ openWiki(p.get("p")); return; }
  if(vista==="cronicas"){ location.hash="cronicas?p="+p.get("p"); return; }
  if(vista==="decisao"){ abreDecisao(p.get("d"),p.get("p")); return; }
  location.hash=vista;
}
/* barra "/" abre a busca de qualquer lugar */
addEventListener("keydown",e=>{ if(e.key==="/"&&!/input|textarea/i.test(e.target.tagName)){ e.preventDefault(); location.hash="busca"; } });

/* ---------- go ---------- */
show(location.hash.slice(1)||"inicio");
})();
