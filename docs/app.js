/* autos-abertos — app estático. Sem backend, sem rastreamento. */
(async function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt=n=>Number(n).toLocaleString("pt-BR");
const ROLE_LABEL={pessoa:"pessoa",empresa:"empresa",autoridade:"autoridade",advogado:"advogado",pseudo:"pseudonimizado"};
const STF="https://noticias.stf.jus.br/postsnoticias/nota-a-imprensa-47/";

/* ---------- tema ---------- */
const root=document.documentElement;
try{const t=localStorage.getItem("bmdb.theme"); if(t) root.dataset.theme=t;}catch(e){}
$("#themeBtn").onclick=()=>{const cur=root.dataset.theme||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");const nx=cur==="dark"?"light":"dark";root.dataset.theme=nx;try{localStorage.setItem("bmdb.theme",nx)}catch(e){};if(renderer){applyColors();renderer.refresh();}};

/* ---------- dados ---------- */
const load=async f=>(await fetch("data/"+f)).json();
const [G,ENT,PROCS,XREF,TL,CNPJS,META]=await Promise.all(["graph.json","entities.json","processos.json","crossrefs.json","timeline.json","cnpjs.json","meta.json"].map(load));
const byId=new Map(G.nodes.map(n=>[n.id,n]));
const roleOf=n=>n.vis?n.papel:"pseudo";
const colorOf=n=>css("--"+roleOf(n));

/* ---------- roteador ---------- */
const views=["inicio","trilhas","grafo","processos","tempo","metodo"];
function show(v){ if(!views.includes(v)) v="inicio";
  views.forEach(x=>{$("#v-"+x).hidden=(x!==v)});
  $$("[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===v));
  if(v==="grafo") mountGraph($(".graph-wrap"),$("#v-grafo"));
  if(v==="trilhas") renderStep();
  window.scrollTo({top:0});
}
addEventListener("hashchange",()=>show(location.hash.slice(1)));
$$("[data-nav]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();location.hash=a.dataset.nav;}));

/* ---------- início ---------- */
$("#tiles").innerHTML=[[META.corpus.paginas,"páginas"],[META.corpus.pdfs,"peças (PDF)"],[META.corpus.processos.length,"processos"],[META.grafo.nos,"nós no grafo"],[META.grafo.arestas,"relações"],[META.grafo.pseudonimizados,"pessoas pseudonimizadas"]].map(([b,s])=>`<div class="tile"><b>${fmt(b)}</b><span>${s}</span></div>`).join("");
$("#buildInfo").textContent=`Dados gerados em ${META.gerado_em}. Pacote de origem: ${META.fonte.pacote}, ${fmt(META.fonte.bytes)} bytes, modificado em ${META.fonte.last_modified}.`;

/* ---------- grafo ---------- */
const graph=new graphology.Graph({type:"undirected"});
G.nodes.forEach(n=>graph.addNode(n.id,{x:n.x,y:n.y,size:3+Math.log2(n.docs+1)*2.1,label:n.label,color:"#999",n}));
G.edges.forEach(e=>{const s=G.nodes[e.s].id,d=G.nodes[e.d].id; if(!graph.hasEdge(s,d)) graph.addEdge(s,d,{w:e.w,p:e.p,size:.6+Math.log2(e.w)*.9});});
function applyColors(){graph.forEachNode((id,a)=>graph.setNodeAttribute(id,"color",colorOf(a.n)));}
applyColors();
/* layout: ForceAtlas2 no navegador (a partir das posições pré-calculadas), com cache local por versão dos dados */
(function layout(){ const key="bmdb.layout."+META.gerado_em; let cached=null; try{cached=JSON.parse(localStorage.getItem(key)||"null")}catch(e){}
  if(cached&&Object.keys(cached).length===graph.order){ graph.forEachNode(id=>{const p=cached[id]; if(p){graph.setNodeAttribute(id,"x",p[0]);graph.setNodeAttribute(id,"y",p[1]);}}); return; }
  const FA=graphologyLibrary.layoutForceAtlas2; const settings=FA.inferSettings(graph); Object.assign(settings,{gravity:1.2,scalingRatio:8,strongGravityMode:false,barnesHutOptimize:true,adjustSizes:false,linLogMode:true,edgeWeightInfluence:.6,slowDown:2});
  FA.assign(graph,{iterations:500,settings,getEdgeWeight:"w"});
  graphologyLibrary.layoutNoverlap.assign(graph,{maxIterations:120,settings:{margin:2,ratio:1.2,expansion:1.1}});
  const out={}; graph.forEachNode((id,a)=>out[id]=[+a.x.toFixed(2),+a.y.toFixed(2)]); try{localStorage.setItem(key,JSON.stringify(out))}catch(e){}
})();
const F={roles:new Set(["pessoa","empresa","autoridade"]),proc:"",minDocs:3};
let renderer=null, hovered=null, selected=null, pathMode=false, pathA=null, pathSet=null, pinned=null; // pinned: conjunto de nós fixos (trilhas)
function visible(id){const n=byId.get(id); if(pinned) return pinned.has(id); if(!F.roles.has(roleOf(n))) return false; if(n.docs<F.minDocs) return false; if(F.proc && !n.pe.some(([p])=>p===F.proc)) return false; return true;}
function reducers(){
  const neigh=hovered?new Set([hovered,...graph.neighbors(hovered)]):null;
  const dark=(root.dataset.theme||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"))==="dark";
  return {
    nodeReducer(id,a){const r={...a}; if(!visible(id)){r.hidden=true;return r;}
      if(pathSet){ if(!pathSet.nodes.has(id)){r.color=dark?"#2A3040":"#E9E5DC";r.label="";} else {r.zIndex=2;r.highlighted=true;} return r;}
      if(neigh){ if(!neigh.has(id)){r.color=dark?"#2A3040":"#E9E5DC";r.label="";} else {r.zIndex=2;r.forceLabel=true;} }
      if(selected===id){r.highlighted=true;r.zIndex=3;} return r;},
    edgeReducer(e,a){const r={...a}; const [s,d]=graph.extremities(e); if(!visible(s)||!visible(d)){r.hidden=true;return r;}
      if(pathSet){ if(pathSet.edges.has(e)){r.color=css("--accent2");r.size=a.size*1.8;r.zIndex=2;} else r.color=dark?"#222835":"#EFECE4"; return r;}
      if(neigh){ if(s===hovered||d===hovered){r.color=css("--accent");r.zIndex=1;} else r.color=dark?"#222835":"#EFECE4"; } return r;}
  };
}
function mountGraph(wrap,into){ // reparenta o container do grafo entre a vista "grafo" e o passo da trilha
  if(wrap.parentElement!==into) into.appendChild(wrap);
  if(!renderer){
    renderer=new Sigma(graph,$("#sigma"),{renderEdgeLabels:false,labelRenderedSizeThreshold:9,labelFont:"Inter",labelSize:13,labelColor:{color:css("--ink")},defaultEdgeColor:"#DDD8CC",zIndex:true,...reducers()});
    renderer.on("enterNode",({node})=>{hovered=node;renderer.refresh();});
    renderer.on("leaveNode",()=>{hovered=null;renderer.refresh();});
    renderer.on("clickNode",({node})=>{ if(pathMode){ pathClick(node); return;} select(node); });
    renderer.on("clickStage",()=>{ if(!pathMode){ select(null);} });
  } else { renderer.setSetting("labelColor",{color:css("--ink")}); setTimeout(()=>renderer.refresh(),0); }
  const {nodeReducer,edgeReducer}=reducers(); renderer.setSetting("nodeReducer",nodeReducer); renderer.setSetting("edgeReducer",edgeReducer);
}
function refresh(){ if(!renderer) return; const {nodeReducer,edgeReducer}=reducers(); renderer.setSetting("nodeReducer",nodeReducer); renderer.setSetting("edgeReducer",edgeReducer); renderer.refresh(); }
function focus(id,ratio=.22){ if(!renderer||!graph.hasNode(id)) return; const p=renderer.getNodeDisplayData(id); if(p) renderer.getCamera().animate({x:p.x,y:p.y,ratio},{duration:600}); }
function select(id){ selected=id; refresh(); renderPanel(id); if(id) focus(id); }
function openNode(id){ location.hash="grafo"; setTimeout(()=>{ if(!visible(id)){ F.minDocs=2; $("#minDocs").value=2; $("#minDocsOut").textContent=2; F.roles.add(roleOf(byId.get(id))); syncChips(); } select(id); },60); }
/* painel */
function spark(tl){const ks=Object.keys(tl).sort(); if(ks.length<2) return ""; const vals=ks.map(k=>tl[k]); const mx=Math.max(...vals); const W=320,H=46; const pts=ks.map((k,i)=>`${(i/(ks.length-1))*W},${H-2-(tl[k]/mx)*(H-6)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="${css("--accent")}" stroke-width="1.5" points="${pts}"/></svg><div class="muted" style="display:flex;justify-content:space-between;font-size:11px"><span>${ks[0]}</span><span>datas citadas junto ao nome</span><span>${ks[ks.length-1]}</span></div>`;}
function renderPanel(id){ const P=$("#panel"); if(!id){P.hidden=true;return;} const n=byId.get(id), e=ENT[id]||{cit:[],tl:{}};
  const neigh=graph.neighbors(id).map(m=>[m,graph.getEdgeAttribute(graph.edge(id,m),"w")]).sort((a,b)=>b[1]-a[1]).slice(0,14);
  const mxp=Math.max(1,...n.pe.map(x=>x[1]));
  P.innerHTML=`<button class="close" aria-label="Fechar">×</button><h3>${n.label}</h3><span class="badge" style="--c:var(--${roleOf(n)})">${ROLE_LABEL[roleOf(n)]}</span>${n.vis?"":' <span class="muted">nome omitido por política</span>'}
  <div class="kv"><div><b>${fmt(n.docs)}</b><span>peças</span></div><div><b>${n.procs}</b><span>processos</span></div><div><b>${fmt(n.mentions)}</b><span>menções</span></div></div>
  <h4>Presença por processo</h4><div class="bars">${n.pe.slice(0,8).map(([p,c])=>`<div class="bar"><span>${p}</span><i style="width:${(c/mxp)*100}%"></i><span>${c}</span></div>`).join("")}</div>
  <h4>Aparece junto de</h4><div class="neigh">${neigh.map(([m,w])=>`<button data-go="${m}"><i style="--c:var(--${roleOf(byId.get(m))})"></i>${byId.get(m).label}<span class="muted">${w}</span></button>`).join("")}</div>
  ${spark(e.tl||{})}
  <h4>Onde conferir</h4><table><tr><th>processo</th><th>seq</th><th>peça</th><th>pág.</th></tr>${(e.cit||[]).slice(0,12).map(([p,s,t,pg,c])=>`<tr><td>${p}</td><td>${String(s).padStart(5,"0")}</td><td>${t}</td><td>${pg}</td></tr>`).join("")}</table>
  <p class="src">"seq" é o número que inicia o nome do arquivo na pasta do processo dentro do <a href="${STF}" target="_blank" rel="noopener">pacote público do STF</a>. Coocorrência na mesma página não prova relação; é um ponto de partida para leitura.</p>`;
  P.hidden=false; $(".close",P).onclick=()=>select(null); $$("[data-go]",P).forEach(b=>b.onclick=()=>{const t=b.dataset.go; if(!visible(t)){F.roles.add(roleOf(byId.get(t)));F.minDocs=Math.min(F.minDocs,byId.get(t).docs);$("#minDocs").value=F.minDocs;$("#minDocsOut").textContent=F.minDocs;syncChips();} select(t);});
}
/* controles */
function syncChips(){$$("#roleChips .chip").forEach(c=>c.classList.toggle("on",F.roles.has(c.dataset.role)));}
$$("#roleChips .chip").forEach(c=>c.onclick=()=>{const r=c.dataset.role; F.roles.has(r)?F.roles.delete(r):F.roles.add(r); syncChips(); refresh();});
const procSel=$("#procSel"); META.corpus.processos.forEach(p=>procSel.insertAdjacentHTML("beforeend",`<option>${p}</option>`)); procSel.onchange=()=>{F.proc=procSel.value;refresh();};
$("#minDocs").oninput=e=>{F.minDocs=+e.target.value;$("#minDocsOut").textContent=F.minDocs;refresh();};
$("#resetView").onclick=()=>{renderer&&renderer.getCamera().animatedReset({duration:500}); pathSet=null; refresh();};
/* busca */
const S=$("#search"), SU=$("#sugg"); let hl=-1;
function suggest(q){ q=q.trim().toLowerCase(); if(!q){SU.hidden=true;return;} const m=G.nodes.filter(n=>n.label.toLowerCase().includes(q)).sort((a,b)=>b.docs-a.docs).slice(0,9);
  SU.innerHTML=m.map(n=>`<li data-id="${n.id}"><i class="badge" style="--c:var(--${roleOf(n)});padding:0;width:8px;height:8px;border-radius:50%"></i>${n.label}<span class="muted">${n.docs} peças</span></li>`).join(""); SU.hidden=!m.length; hl=-1;
  $$("li",SU).forEach(li=>li.onclick=()=>{pick(li.dataset.id)}); }
function pick(id){SU.hidden=true;S.value=byId.get(id).label; if(!visible(id)){F.roles.add(roleOf(byId.get(id)));F.minDocs=Math.min(F.minDocs,byId.get(id).docs);$("#minDocs").value=F.minDocs;$("#minDocsOut").textContent=F.minDocs;syncChips();} if(pathMode) pathClick(id); else select(id);}
S.oninput=()=>suggest(S.value); S.onkeydown=e=>{const li=$$("li",SU); if(e.key==="ArrowDown"){hl=Math.min(hl+1,li.length-1);} else if(e.key==="ArrowUp"){hl=Math.max(hl-1,0);} else if(e.key==="Enter"){ if(li[hl]) li[hl].click(); else if(li[0]) li[0].click(); return;} else if(e.key==="Escape"){SU.hidden=true;return;} else return; li.forEach((l,i)=>l.classList.toggle("hl",i===hl));};
S.addEventListener("keypress",e=>{ if(e.key==="Enter"){ e.preventDefault(); const li=$$("li",SU); if(li[Math.max(hl,0)]) { li[Math.max(hl,0)].click(); return; } const ex=G.nodes.find(n=>n.label.toLowerCase()===S.value.trim().toLowerCase()); if(ex) pick(ex.id); else suggest(S.value); } });
document.addEventListener("click",e=>{if(!e.target.closest(".search")) SU.hidden=true;});
/* caminho */
function setPathMode(on,preA){ pathMode=on; pathA=preA||null; pathSet=null; if(on){ selected=null; renderPanel(null); } const h=$("#pathHint"); h.hidden=!on; h.textContent=on?(pathA?`A = ${byId.get(pathA).label}. Agora clique (ou busque) o nó B.`:"Clique (ou busque) o nó A."):""; $("#pathBtn").classList.toggle("primary",on); refresh(); }
$("#pathBtn").onclick=()=>setPathMode(!pathMode);
function pathClick(id){ if(!pathA){pathA=id;$("#pathHint").textContent=`A = ${byId.get(id).label}. Agora clique (ou busque) o nó B.`;return;}
  const path=graphologyLibrary.shortestPath.bidirectional(graph,pathA,id);
  if(!path){$("#pathHint").textContent="Sem caminho entre os dois no grafo.";pathA=null;return;}
  const edges=new Set(); for(let i=0;i<path.length-1;i++) edges.add(graph.edge(path[i],path[i+1]));
  pathSet={nodes:new Set(path),edges}; $("#pathHint").innerHTML=`Caminho em ${path.length-1} passo(s): ${path.map(p=>byId.get(p).label).join(" → ")} <button class="btn small" id="pathClear" style="margin-left:8px">limpar</button>`;
  $("#pathClear").onclick=()=>setPathMode(false); pathA=null; refresh(); if(window._onPath) window._onPath(path); }

/* ---------- processos ---------- */
const TIPO_COLORS=["#0E7C86","#E4572E","#4B4E9E","#E0A100","#1E8E5A","#8A93A6","#B56576","#6D597A"];
$("#procGrid").innerHTML=PROCS.map(p=>{const tipos=Object.entries(p.tipos).sort((a,b)=>b[1]-a[1]); const tot=tipos.reduce((s,x)=>s+x[1],0)||1;
  return `<article class="proc"><h3>${p.processo}</h3><div class="m">${fmt(p.pdfs)} peças · ${fmt(p.pages)} páginas</div>
  <div class="tipos" title="${tipos.slice(0,6).map(([t,n])=>`${t}: ${n}`).join(" · ")}">${tipos.slice(0,8).map(([t,n],i)=>`<i style="width:${(n/tot)*100}%;background:${TIPO_COLORS[i%8]}"></i>`).join("")}</div>
  <div class="m">${tipos.slice(0,3).map(([t,n])=>`${t} (${n})`).join(" · ")}</div>
  <div class="top" style="margin-top:8px">${p.top.slice(0,6).map(([l,r,n])=>{const id=[...byId.values()].find(x=>x.label===l)?.id; return `<button data-open="${id||""}"><i style="--c:var(--${id?roleOf(byId.get(id)):r})"></i>${l}<small>${n}</small></button>`;}).join("")}</div></article>`;}).join("");
$$("#procGrid [data-open]").forEach(b=>b.onclick=()=>{ if(b.dataset.open) openNode(b.dataset.open); });
const xg={}; XREF.forEach(({s,d,n})=>{(xg[s]=xg[s]||[]).push([d,n]);});
$("#xref").innerHTML=Object.keys(xg).sort().map(s=>`<div><b>${s}</b> cita: ${xg[s].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([d,n])=>`${d} <span class="muted">(${n})</span>`).join(", ")}</div>`).join("");

/* ---------- linha do tempo ---------- */
const tlProc=$("#tlProc"); META.corpus.processos.forEach(p=>tlProc.insertAdjacentHTML("beforeend",`<option>${p}</option>`));
function months(){const out=[]; for(let y=2015;y<=2026;y++) for(let m=1;m<=12;m++){const k=`${y}-${String(m).padStart(2,"0")}`; if(k>"2026-09") break; out.push(k);} return out;}
function drawTL(){ const ms=months(), proc=tlProc.value, log=$("#tlLog").checked;
  const val=ms.map(k=>{const d=TL[k]||{}; return proc?(d[proc]||0):Object.values(d).reduce((a,b)=>a+b,0);});
  const tr=v=>log?Math.log10(v+1):v; const mx=Math.max(1,...val.map(tr)); const W=1400,H=320,pad=30,bw=(W-pad*2)/ms.length;
  $("#tlChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}">${ms.map((k,i)=>{const h=(tr(val[i])/mx)*(H-60); const isJan=k.endsWith("-01"); return `<rect x="${pad+i*bw+1}" y="${H-40-h}" width="${bw-2}" height="${h}" fill="${css("--accent")}" data-k="${k}"></rect>${isJan?`<text x="${pad+i*bw}" y="${H-22}" font-size="11" fill="${css("--muted")}">${k.slice(0,4)}</text>`:""}`;}).join("")}</svg>`;
  $$("#tlChart rect").forEach(r=>r.onmouseenter=()=>{const k=r.dataset.k, d=TL[k]||{}; const top=Object.entries(d).sort((a,b)=>b[1]-a[1]).slice(0,5); $("#tlDetail").innerHTML=`<b>${k}</b> · ${fmt(val[ms.indexOf(k)])} datas citadas${top.length?" · "+top.map(([p,n])=>`${p} (${fmt(n)})`).join(", "):""}`;});
}
tlProc.onchange=drawTL; $("#tlLog").onchange=drawTL; drawTL();

/* ---------- trilhas (mecânica tipo Brilliant: um passo, uma interação, uma pergunta, feedback) ---------- */
const topBy=(pred,key="wdeg")=>G.nodes.filter(pred).sort((a,b)=>b[key]-a[key]);
const centerPessoa=topBy(n=>n.vis&&n.papel==="pessoa")[0];
const topEmpresa=topBy(n=>n.papel==="empresa")[0];
function strongestNeighbor(id,role){return graph.neighbors(id).map(m=>[m,graph.getEdgeAttribute(graph.edge(id,m),"w")]).filter(([m])=>byId.get(m).papel===role).sort((a,b)=>b[1]-a[1]);}
const biggestProc=[...PROCS].sort((a,b)=>b.pages-a.pages)[0];
const empresas5=G.nodes.filter(n=>n.papel==="empresa"&&n.procs>=5).length;
const secondCluster=topBy(n=>n.vis&&n.papel==="pessoa"&&n.c!==centerPessoa.c)[0];
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const STEPS=[
 {t:"O acervo em 30 segundos",b:`Em 10 de setembro de 2026 o relator, ministro <strong>André Mendonça</strong>, retirou o sigilo da Petição 15.556 e de quatorze procedimentos ligados à <strong>Operação Compliance Zero</strong>, a pedido da presidência do STF. No dia seguinte o Tribunal publicou tudo: <strong>${fmt(META.corpus.pdfs)} peças</strong>, <strong>${fmt(META.corpus.paginas)} páginas</strong>. Ninguém lê isso na íntegra. Este site extrai do texto quem aparece, em que papel e ao lado de quem, e devolve cada afirmação à sua página de origem.`,
  quiz:{q:"Qual destas frases descreve corretamente este site?",opts:["Ele hospeda os PDFs do STF para download","Cada relação mostrada aponta para processo, peça e página nos autos","Ele lista todas as pessoas citadas nos autos, com CPF"],a:1,fb:["Não. Os documentos ficam no STF; aqui só há dados derivados.","Exato. A fonte é sempre verificável, e nada substitui a leitura da peça.","Não. Dados pessoais não entram, e pessoas incidentais são pseudonimizadas."]}},
 {t:"Quinze processos, um caso",b:`O material não é um processo só. São inquéritos (INQ), petições (PET) e uma reclamação (RCL) que se citam mutuamente. Os volumes são muito desiguais: a <strong>${biggestProc.processo}</strong> sozinha tem ${fmt(biggestProc.pages)} páginas, quase tudo mídia de DVD com autos de processos federais anexados como prova. Abaixo, os processos ordenados por páginas. Passe o mouse na barra colorida para ver a composição por tipo de peça.`,
  widget:"procs",quiz:{q:"Qual processo concentra mais páginas?",opts:()=>shuffle([biggestProc.processo,...[...PROCS].sort((a,b)=>b.pages-a.pages).slice(1,4).map(p=>p.processo)]),a:o=>o.indexOf(biggestProc.processo),fb:o=>o.map(x=>x===biggestProc.processo?"Isso. E é quase todo prova documental anexada, não narrativa.":"Não. Confira o número de páginas nos cartões.")}},
 {t:"Quem é quem: quatro papéis",b:`Cada nó do grafo recebe um papel inferido do próprio texto. <strong>Empresa</strong>: termo societário no nome. <strong>Autoridade</strong>: cargo no contexto, ou assinatura em todas as páginas de uma peça longa. <strong>Advogado</strong>: remetente do recibo de petição eletrônica, ou inscrição profissional junto ao nome. <strong>Pessoa</strong>: o resto. Por padrão os advogados ficam ocultos, porque assinam juntos as mesmas petições e formam blocos densos que só dizem "trabalham no mesmo escritório".`,
  widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=4;F.proc="";pinned=null;syncChips();refresh();renderer&&renderer.getCamera().animatedReset({duration:400});},
  quiz:{q:"Como um advogado é identificado pelo pipeline?",opts:["Pelo sobrenome, comparado com uma lista de escritórios","Pelo recibo de petição eletrônica ou pela inscrição profissional junto ao nome","Por aparecer em muitas peças"],a:1,fb:["Não. Nenhuma lista externa é usada.","Certo. São dois sinais estruturais que os próprios autos fornecem.","Não. Volume não diz papel: investigados também aparecem muito."]}},
 {t:"O centro do grafo",b:`O nó com mais conexões ponderadas entre as pessoas é <strong>${centerPessoa.label}</strong>. Ele aparece em ${centerPessoa.procs} dos 15 processos e em ${fmt(centerPessoa.docs)} peças narrativas. Passe o mouse sobre ele para ver a vizinhança acesa. A espessura de cada linha é o número de peças em que os dois nomes dividem uma página.`,
  widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=3;pinned=null;syncChips();select(centerPessoa.id);},
  quiz:{q:`Qual EMPRESA divide mais peças com ${centerPessoa.label}?`,opts:()=>{const s=strongestNeighbor(centerPessoa.id,"empresa");const right=s[0][0];const others=shuffle(G.nodes.filter(n=>n.papel==="empresa"&&n.id!==right).slice(0,30)).slice(0,3).map(n=>n.id);return shuffle([right,...others]).map(id=>byId.get(id).label);},
   a:o=>o.indexOf(byId.get(strongestNeighbor(centerPessoa.id,"empresa")[0][0]).label),fb:o=>o.map(x=>`Veja no painel do nó a lista "Aparece junto de", ordenada por peças em comum.`)}},
 {t:"Siga as empresas",b:`Filtrar só empresas revela a espinha dorsal societária do caso: bancos, gestoras, holdings e veículos de investimento que se repetem entre processos diferentes. Uma empresa presente em muitos processos é um fio condutor. Ao todo, <strong>${empresas5}</strong> empresas aparecem em cinco ou mais processos.`,
  widget:"graph",setup(){F.roles=new Set(["empresa"]);F.minDocs=3;pinned=null;syncChips();select(null);refresh();renderer&&renderer.getCamera().animatedReset({duration:400});},
  quiz:{q:"Quantas empresas aparecem em 5 ou mais processos?",opts:()=>shuffle([empresas5,Math.max(1,empresas5-4),empresas5+6,empresas5*2+3]).map(String),a:o=>o.indexOf(String(empresas5)),fb:o=>o.map(()=>"O número está no texto acima; a lição é que recorrência entre processos é sinal, volume dentro de um processo não.")}},
 {t:"Caminho entre dois nomes",b:`A pergunta clássica de apuração: <em>o que liga A a B?</em> O grafo responde com o caminho mais curto. Ative o modo caminho, clique em <strong>${centerPessoa.label}</strong> e depois em <strong>${secondCluster.label}</strong>, que está em outro núcleo do grafo. Os nós intermediários são as pontes que valem uma leitura.`,
  widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=2;pinned=null;syncChips();select(null);setPathMode(true,centerPessoa.id);focus(secondCluster.id,.35);},
  quiz:{q:`Quantos passos tem o caminho mais curto entre ${centerPessoa.label} e ${secondCluster.label}?`,opts:()=>{const p=graphologyLibrary.shortestPath.bidirectional(graph,centerPessoa.id,secondCluster.id);const k=p?p.length-1:0;return shuffle([k,k+1,k+2,Math.max(0,k-1)].filter((v,i,a)=>a.indexOf(v)===i)).map(String);},
   a:o=>{const p=graphologyLibrary.shortestPath.bidirectional(graph,centerPessoa.id,secondCluster.id);return o.indexOf(String(p?p.length-1:0));},fb:o=>o.map(()=>"Trace o caminho no grafo e conte as setas.")}},
 {t:"Ler a fonte",b:`Nada aqui é conclusão. Cada nó tem uma tabela "Onde conferir" com <strong>processo, seq e página</strong>. O <em>seq</em> é o número sequencial da peça no processo, e é também o início do nome do arquivo na pasta correspondente do pacote público do STF. Abra o painel de <strong>${topEmpresa.label}</strong> e veja.`,
  widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=3;pinned=null;syncChips();setPathMode(false);select(topEmpresa.id);},
  quiz:{q:'Uma citação diz "PET 15556 · seq 00480 · Decisao monocratica · pág. 2". O que isso significa?',opts:["Página 2 do documento nº 480 da pasta da Pet 15.556, que é uma decisão monocrática","O 480º parágrafo da decisão","Um link para o site do STF com o texto"],a:0,fb:["Exato. É assim que você chega ao PDF certo no pacote.","Não. O seq identifica o arquivo, não um parágrafo.","Não. O site não hospeda nem linka texto integral; ele diz onde está."]}},
 {t:"Agora é com você",b:`Você já sabe ler o grafo, filtrar por papel, traçar caminhos e conferir a fonte. Sugestões de perguntas para começar: quem são as pontes entre os núcleos? Que empresa aparece em processos que não se citam? Quais autoridades assinam peças em mais de um processo? Se encontrar erro de identificação ou de papel, abra uma issue no repositório: a política é corrigir rápido.`,
  widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=3;pinned=null;syncChips();setPathMode(false);select(null);refresh();renderer&&renderer.getCamera().animatedReset({duration:400});},done:true}
];
let T={cur:0,done:[]}; try{T={...T,...JSON.parse(localStorage.getItem("bmdb.trail")||"{}")}}catch(e){}
function saveT(){try{localStorage.setItem("bmdb.trail",JSON.stringify(T))}catch(e){}}
function renderRail(){$("#railSteps").innerHTML=STEPS.map((s,i)=>`<li class="${i===T.cur?"cur":""} ${T.done.includes(i)?"done":""}" data-i="${i}"><span class="n">${T.done.includes(i)?"✓":i+1}</span>${s.t}</li>`).join(""); $$("#railSteps li").forEach(li=>li.onclick=()=>{T.cur=+li.dataset.i;saveT();renderStep();});}
function renderStep(){ const i=T.cur, s=STEPS[i]; renderRail(); $("#stepNum").textContent=`Passo ${i+1} de ${STEPS.length}`; $("#stepTitle").textContent=s.t; $("#stepBody").innerHTML=s.b;
  const W=$("#stepWidget"); { const gw=$(".graph-wrap"); if(gw && W.contains(gw)) $("#v-grafo").appendChild(gw); } W.innerHTML="";
  if(s.widget==="graph"){ const wrap=$(".graph-wrap"); const holder=document.createElement("div"); holder.className="mini"; W.appendChild(holder); mountGraph(wrap,holder); setTimeout(()=>{renderer.refresh(); s.setup&&s.setup();},80); }
  else { if($(".graph-wrap").parentElement!==$("#v-grafo")) mountGraph($(".graph-wrap"),$("#v-grafo")); if(s.widget==="procs") W.innerHTML=`<div class="proc-grid">${[...PROCS].sort((a,b)=>b.pages-a.pages).slice(0,8).map(p=>{const tipos=Object.entries(p.tipos).sort((a,b)=>b[1]-a[1]);const tot=tipos.reduce((x,y)=>x+y[1],0)||1;return `<article class="proc"><h3>${p.processo}</h3><div class="m">${fmt(p.pdfs)} peças · ${fmt(p.pages)} páginas</div><div class="tipos" title="${tipos.slice(0,6).map(([t,n])=>`${t}: ${n}`).join(" · ")}">${tipos.slice(0,8).map(([t,n],k)=>`<i style="width:${(n/tot)*100}%;background:${TIPO_COLORS[k%8]}"></i>`).join("")}</div></article>`;}).join("")}</div>`; }
  const Q=$("#stepQuiz"); Q.innerHTML="";
  if(s.quiz){ const opts=typeof s.quiz.opts==="function"?s.quiz.opts():s.quiz.opts; const ans=typeof s.quiz.a==="function"?s.quiz.a(opts):s.quiz.a; const fbs=typeof s.quiz.fb==="function"?s.quiz.fb(opts):s.quiz.fb;
    Q.innerHTML=`<h4>${s.quiz.q}</h4><div class="opts">${opts.map((o,k)=>`<button data-k="${k}">${o}</button>`).join("")}</div><div class="fb"></div>`;
    $$("button",Q).forEach(b=>b.onclick=()=>{const k=+b.dataset.k; $$("button",Q).forEach(x=>x.classList.remove("right","wrong")); b.classList.add(k===ans?"right":"wrong"); const f=$(".fb",Q); f.textContent=fbs[k]; f.className="fb "+(k===ans?"ok":"no"); if(k===ans&&!T.done.includes(i)){T.done.push(i);saveT();renderRail();}});
  } else if(s.done){ Q.innerHTML=`<h4>Trilha concluída</h4><p>${T.done.length} de ${STEPS.length-1} perguntas acertadas. <a href="#grafo" data-nav="grafo">Abrir o grafo completo →</a></p>`; $("[data-nav]",Q).onclick=e=>{e.preventDefault();location.hash="grafo";}; }
  $("#prevStep").disabled=i===0; $("#nextStep").textContent=i===STEPS.length-1?"Ir para o grafo →":"Próximo →";
}
$("#prevStep").onclick=()=>{T.cur=Math.max(0,T.cur-1);saveT();renderStep();};
$("#nextStep").onclick=()=>{ if(T.cur===STEPS.length-1){location.hash="grafo";return;} T.cur++; saveT(); renderStep(); };
$("#resetTrail").onclick=()=>{T={cur:0,done:[]};saveT();renderStep();};

/* ---------- go ---------- */
show(location.hash.slice(1)||"inicio");
})();
