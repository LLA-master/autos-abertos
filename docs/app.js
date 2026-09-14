/* autos-abertos — app estático. Sem backend, sem rastreamento. */
(async function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt=n=>Number(n).toLocaleString("pt-BR");
const ROLE_LABEL={pessoa:"pessoa",empresa:"empresa",autoridade:"autoridade",advogado:"advogado",pseudo:"pseudonimizado"};
const ROLE_PL={pessoa:"Pessoas",empresa:"Empresas",autoridade:"Autoridades",advogado:"Advogados",pseudo:"Pseudonimizados"};
const TIPO={"Decisao monocratica":"Decisão monocrática","Peticao":"Petição","Peticao inicial":"Petição inicial","Despacho":"Despacho","Busca e apreensao":"Busca e apreensão","Prisao preventiva":"Prisão preventiva","Inquerito":"Inquérito","Sequestro":"Sequestro","Manifestacao":"Manifestação","Manifestacao da PGR":"Manifestação da PGR","Outras pecas":"Outras peças","Vista a PGR":"Vista à PGR","Mandado":"Mandado","Restituicao de coisas apreendidas":"Restituição de coisas apreendidas","Certidao de julgamento":"Certidão de julgamento","Documentos comprobatorios":"Documentos comprobatórios","Documento comprobatorio":"Documento comprobatório","Recibo de peticao eletronica":"Recibo de petição eletrônica","Comunicacao assinada":"Comunicação assinada","Procuracao":"Procuração","Intimacao":"Intimação","Certidao":"Certidão","Mandado de intimacao":"Mandado de intimação","Documentos de identificacao":"Documentos de identificação","Malote Digital":"Malote digital","Termo de disponibilizacao de autos":"Termo de disponibilização","Aviso de recebimento":"Aviso de recebimento"};
const tipo=t=>TIPO[t]||t;
const STF="https://noticias.stf.jus.br/postsnoticias/nota-a-imprensa-47/";
const COMM=["#FF2E97","#19E3FF","#FFD166","#B983FF","#FF8C42","#3DF2A0","#FF5C7A","#7FDBFF","#F7A8B8","#C3F73A","#FFB4E6","#8AFFC1","#FF9D5C","#9DB4FF","#E2B4FF","#5CE1FF"];

/* ---------- tema ---------- */
const root=document.documentElement;
try{const t=localStorage.getItem("bmdb.theme"); if(t) root.dataset.theme=t;}catch(e){}
const isDark=()=>root.dataset.theme!=="light";
function themeBtn(){$("#themeBtn").textContent=isDark()?"☀":"☾";}
themeBtn();
$("#themeBtn").onclick=()=>{root.dataset.theme=isDark()?"light":"dark";try{localStorage.setItem("bmdb.theme",root.dataset.theme)}catch(e){};themeBtn();if(renderer){applyColors();renderer.setSetting("labelColor",{color:css("--label")});renderer.refresh();} if(mm.mode) drawMM();};

/* ---------- dados ---------- */
const load=async f=>(await fetch("data/"+f)).json();
const [G,ENT,PROCS,XREF,TL,CNPJS,META,WIKI]=await Promise.all(["graph.json","entities.json","processos.json","crossrefs.json","timeline.json","cnpjs.json","meta.json","wiki.json"].map(load));
const byId=new Map(G.nodes.map(n=>[n.id,n]));
const byLabel=new Map(G.nodes.map(n=>[n.label,n]));
const roleOf=n=>n.vis?n.papel:"pseudo";
const colorOf=n=>css("--"+roleOf(n));

/* ---------- roteador ---------- */
const views=["inicio","tour","grafo","mapa","personagens","processos","tempo","metodo"];
function show(v){ if(!views.includes(v)) v="inicio";
  views.forEach(x=>{$("#v-"+x).hidden=(x!==v)});
  $$("[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===v));
  if(v==="grafo") mountGraph($(".graph-wrap"),$("#v-grafo"));
  if(v==="tour") renderStep();
  if(v==="mapa"){ if(!mm.mode){mm.mode="caso";} drawMM(); }
  if(v==="personagens") renderWiki();
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
G.edges.forEach(e=>{const s=G.nodes[e.s].id,d=G.nodes[e.d].id; if(!graph.hasEdge(s,d)) graph.addEdge(s,d,{w:e.w,p:e.p,size:.5+Math.log2(e.w)*.8});});
let commColor=false;
function applyColors(){graph.forEachNode((id,a)=>graph.setNodeAttribute(id,"color",commColor&&a.n.c>=0?COMM[a.n.c%COMM.length]:colorOf(a.n)));}
applyColors();
(function layout(){ const key="bmdb.layout2."+META.gerado_em; let cached=null; try{cached=JSON.parse(localStorage.getItem(key)||"null")}catch(e){}
  if(cached&&Object.keys(cached).length===graph.order){ graph.forEachNode(id=>{const p=cached[id]; if(p){graph.setNodeAttribute(id,"x",p[0]);graph.setNodeAttribute(id,"y",p[1]);}}); return; }
  const FA=graphologyLibrary.layoutForceAtlas2; const settings=FA.inferSettings(graph); Object.assign(settings,{gravity:.7,scalingRatio:22,strongGravityMode:false,barnesHutOptimize:true,adjustSizes:false,linLogMode:true,edgeWeightInfluence:.6,slowDown:2});
  FA.assign(graph,{iterations:600,settings,getEdgeWeight:"w"});
  graphologyLibrary.layoutNoverlap.assign(graph,{maxIterations:150,settings:{margin:3,ratio:1.3,expansion:1.15}});
  const out={}; graph.forEachNode((id,a)=>out[id]=[+a.x.toFixed(2),+a.y.toFixed(2)]); try{localStorage.setItem(key,JSON.stringify(out))}catch(e){}
})();
const F={roles:new Set(["pessoa","empresa","autoridade"]),proc:"",minDocs:4,minW:2,topN:120,collapse:false,focus:false,depth:1,labelsAll:false};
const hiddenSet=new Set(); let topSet=null, focusSet=null;
let renderer=null, hovered=null, selected=null, pathMode=false, pathA=null, pathSet=null;
function baseVisible(id){const n=byId.get(id); if(hiddenSet.has(id)) return false; if(!F.roles.has(roleOf(n))) return false; if(n.docs<F.minDocs) return false; if(F.proc && !n.pe.some(([p])=>p===F.proc)) return false; if(topSet&&!topSet.has(id)) return false; return true;}
function visible(id){ if(!baseVisible(id)) return false; if(focusSet&&!focusSet.has(id)) return false; if(F.collapse){ let d=0; for(const m of graph.neighbors(id)){ if(baseVisible(m)&&(!focusSet||focusSet.has(m))&&graph.getEdgeAttribute(graph.edge(id,m),"w")>=F.minW){ d++; if(d>1) break; } } if(d<=1 && id!==selected) return false; } return true;}
function recompute(){ topSet=F.topN?new Set(G.nodes.slice().sort((a,b)=>b.docs-a.docs).slice(0,F.topN).map(n=>n.id)):null;
  if(F.focus&&selected){ const set=new Set([selected]); let frontier=[selected]; for(let k=0;k<F.depth;k++){ const nx=[]; frontier.forEach(u=>graph.neighbors(u).forEach(v=>{ if(!set.has(v)&&graph.getEdgeAttribute(graph.edge(u,v),"w")>=F.minW){set.add(v);nx.push(v);} })); frontier=nx; } focusSet=set; } else focusSet=null; }
function reducers(){
  const focusId=hovered||selected; const neigh=focusId?new Set([focusId,...graph.neighbors(focusId)]):null;
  const dim=css("--node-dim"), dimE=css("--edge-dim"), baseE=css("--edge");
  return {
    nodeReducer(id,a){const r={...a}; if(!visible(id)){r.hidden=true;return r;}
      if(pathSet){ if(!pathSet.nodes.has(id)){r.color=dim;r.label="";} else {r.zIndex=2;r.highlighted=true;r.forceLabel=true;} return r;}
      if(neigh){ if(!neigh.has(id)){r.color=dim;r.label="";} else {r.zIndex=2;r.forceLabel=true;} }
      if(F.labelsAll) r.forceLabel=true;
      if(selected===id){r.highlighted=true;r.zIndex=3;} return r;},
    edgeReducer(e,a){const r={...a}; const [s,d]=graph.extremities(e); if(!visible(s)||!visible(d)||a.w<F.minW){r.hidden=true;return r;}
      r.color=baseE;
      if(pathSet){ if(pathSet.edges.has(e)){r.color=css("--pink");r.size=a.size*2;r.zIndex=2;} else r.color=dimE; return r;}
      if(neigh){ if(s===focusId||d===focusId){r.color=css("--cyan");r.size=a.size*1.4;r.zIndex=1;} else r.color=dimE; } return r;}
  };
}
function mountGraph(wrap,into){
  if(wrap.parentElement!==into) into.appendChild(wrap);
  if(!renderer){
    renderer=new Sigma(graph,$("#sigma"),{renderEdgeLabels:false,labelRenderedSizeThreshold:10,labelDensity:.08,labelGridCellSize:70,labelFont:"Outfit, Inter, sans-serif",labelSize:13,labelWeight:"500",labelColor:{color:css("--label")},zIndex:true,...reducers()});
    renderer.on("enterNode",({node})=>{hovered=node;renderer.refresh();});
    renderer.on("leaveNode",()=>{hovered=null;renderer.refresh();});
    let downAt=null; renderer.on("downNode",({event})=>{ downAt=[event.x,event.y]; });
    renderer.on("clickNode",({node,event})=>{ if(downAt&&Math.hypot(event.x-downAt[0],event.y-downAt[1])>6){ downAt=null; return; } downAt=null; if(pathMode){ pathClick(node); return;} select(node); });
    renderer.on("clickStage",()=>{ if(!pathMode){ select(null);} });
    renderer.on("doubleClickNode",({node,event})=>{ event.preventSigmaDefault(); F.focus=true; $("#focusMode").checked=true; select(node); });
    addEventListener("keydown",e=>{ if(e.key==="Escape"){ if(pathMode) setPathMode(false); else select(null); } });
    bindDrag();
  } else { renderer.setSetting("labelColor",{color:css("--label")}); setTimeout(()=>renderer.refresh(),0); }
  refresh();
}
function refresh(){ if(!renderer) return; recompute(); const {nodeReducer,edgeReducer}=reducers(); renderer.setSetting("nodeReducer",nodeReducer); renderer.setSetting("edgeReducer",edgeReducer); renderer.refresh(); }
function focus(id,ratio=.22){ if(!renderer||!graph.hasNode(id)) return; const p=renderer.getNodeDisplayData(id); if(p) renderer.getCamera().animate({x:p.x,y:p.y,ratio},{duration:600}); }
function select(id){ selected=id; refresh(); renderPanel(id); if(id) focus(id, F.focus?.3:.22); }
function ensureVisible(id){ const n=byId.get(id); if(visible(id)) return; F.roles.add(roleOf(n)); if(n.docs<F.minDocs){F.minDocs=Math.max(2,n.docs);$("#minDocs").value=F.minDocs;$("#minDocsOut").textContent=F.minDocs;} if(F.proc&&!n.pe.some(([p])=>p===F.proc)){F.proc="";$("#procSel").value="";} syncChips(); }
function openNode(id){ location.hash="grafo"; setTimeout(()=>{ ensureVisible(id); select(id); },60); }
function spark(tl){const ks=Object.keys(tl).sort(); if(ks.length<2) return ""; const vals=ks.map(k=>tl[k]); const mx=Math.max(...vals); const W=320,H=46; const pts=ks.map((k,i)=>`${(i/(ks.length-1))*W},${H-2-(tl[k]/mx)*(H-6)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="${css("--cyan")}" stroke-width="1.5" points="${pts}"/></svg><div class="muted" style="display:flex;justify-content:space-between;font-size:11px"><span>${ks[0]}</span><span>datas citadas junto ao nome</span><span>${ks[ks.length-1]}</span></div>`;}
function renderPanel(id){ const P=$("#panel"); if(!id){P.hidden=true;return;} const n=byId.get(id), e=ENT[id]||{cit:[],tl:{}};
  const neigh=graph.neighbors(id).map(m=>[m,graph.getEdgeAttribute(graph.edge(id,m),"w")]).sort((a,b)=>b[1]-a[1]).slice(0,14);
  const mxp=Math.max(1,...n.pe.map(x=>x[1]));
  P.innerHTML=`<button class="close" aria-label="Fechar">×</button><h3>${n.label}</h3><span class="badge" style="--c:var(--${roleOf(n)})">${ROLE_LABEL[roleOf(n)]}</span>${n.vis?"":' <span class="muted">nome omitido por política</span>'}
  <div class="kv"><div><b>${fmt(n.docs)}</b><span>peças</span></div><div><b>${n.procs}</b><span>processos</span></div><div><b>${fmt(n.mentions)}</b><span>menções</span></div></div>
  <div class="acts">${wkBy.has(id)?`<button class="btn small" data-wiki="${id}">Ficha</button>`:""}<button class="btn small" data-mm="${id}">Mapa mental</button><button class="btn small" data-focus="${id}">Só a vizinhança</button><button class="btn ghost small" data-hide="${id}">Ocultar nó</button></div>
  <h4>Presença por processo</h4><div class="bars">${n.pe.slice(0,8).map(([p,c])=>`<div class="bar"><span>${p}</span><i style="width:${(c/mxp)*100}%"></i><span>${c}</span></div>`).join("")}</div>
  <h4>Aparece junto de</h4><div class="neigh">${neigh.map(([m,w])=>`<button data-go="${m}" style="--c:var(--${roleOf(byId.get(m))})"><i></i>${byId.get(m).label}<span class="muted">${w}</span></button>`).join("")}</div>
  ${spark(e.tl||{})}
  <h4>Onde conferir</h4><table><tr><th>processo</th><th>seq</th><th>peça</th><th>pág.</th></tr>${(e.cit||[]).slice(0,12).map(([p,s,t,pg,c])=>`<tr><td>${p}</td><td>${String(s).padStart(5,"0")}</td><td>${tipo(t)}</td><td>${pg}</td></tr>`).join("")}</table>
  <p class="src">"seq" é o número que inicia o nome do arquivo na pasta do processo dentro do <a href="${STF}" target="_blank" rel="noopener">pacote público do STF</a>. Coocorrência na mesma página não prova relação; é um ponto de partida para leitura.</p>`;
  P.hidden=false; $(".close",P).onclick=()=>select(null); $$("[data-go]",P).forEach(b=>b.onclick=()=>{ensureVisible(b.dataset.go); select(b.dataset.go);}); const wb=$("[data-wiki]",P); if(wb) wb.onclick=()=>openWiki(id); $("[data-mm]",P).onclick=()=>{ mmCenter(id); location.hash="mapa"; }; $("[data-hide]",P).onclick=()=>hideNode(id); $("[data-focus]",P).onclick=()=>{ F.focus=true; $("#focusMode").checked=true; refresh(); focus(id,.3); };
}
function syncChips(){$$("#roleChips .chip").forEach(c=>c.classList.toggle("on",F.roles.has(c.dataset.role)));}
$$("#roleChips .chip").forEach(c=>c.onclick=()=>{const r=c.dataset.role; F.roles.has(r)?F.roles.delete(r):F.roles.add(r); syncChips(); refresh();});
const procSel=$("#procSel"); META.corpus.processos.forEach(p=>procSel.insertAdjacentHTML("beforeend",`<option>${p}</option>`)); procSel.onchange=()=>{F.proc=procSel.value;refresh();};
$("#minDocs").oninput=e=>{F.minDocs=+e.target.value;$("#minDocsOut").textContent=F.minDocs;refresh();};
$("#commColor").onchange=e=>{commColor=e.target.checked;applyColors();refresh();};
$("#resetView").onclick=()=>{renderer&&renderer.getCamera().animatedReset({duration:500}); pathSet=null; refresh();};
$("#zoomIn").onclick=()=>renderer&&renderer.getCamera().animatedZoom({duration:250}); $("#zoomOut").onclick=()=>renderer&&renderer.getCamera().animatedUnzoom({duration:250});
$("#minW").oninput=e=>{F.minW=+e.target.value;$("#minWOut").textContent=F.minW;refresh();};
$("#topN").onchange=e=>{F.topN=+e.target.value;refresh();};
$("#labelsAll").onchange=e=>{F.labelsAll=e.target.checked;refresh();};
$("#collapseLeaves").onchange=e=>{F.collapse=e.target.checked;refresh();};
$("#focusMode").onchange=e=>{F.focus=e.target.checked;refresh(); if(F.focus&&selected) focus(selected,.3);};
$("#focusDepth").onchange=e=>{F.depth=+e.target.value;refresh();};
function hideNode(id){ hiddenSet.add(id); if(selected===id) selected=null; renderPanel(null); $("#hiddenCount").textContent=hiddenSet.size; $("#restoreHidden").hidden=false; refresh(); }
$("#restoreHidden").onclick=()=>{ hiddenSet.clear(); $("#restoreHidden").hidden=true; refresh(); };
/* modo mapa mental dentro da vista do grafo */
$("#mmToggle").onchange=e=>{ const on=e.target.checked; const v=$("#v-grafo"); v.classList.toggle("mm-in-graph",on); if(on){ v.appendChild($(".mm-wrap")); mm.mode="entidade"; mm.center=selected||centerPessoa.id; mm.vb=null; drawMM(); } else { $("#v-mapa").appendChild($(".mm-wrap")); mountGraph($(".graph-wrap"),v); } };
/* busca genérica com sugestões */
function attachSearch(input,list,onPick){ let hl=-1;
  const suggest=q=>{ q=q.trim().toLowerCase(); if(!q){list.hidden=true;return;} const m=G.nodes.filter(n=>n.vis&&n.label.toLowerCase().includes(q)).sort((a,b)=>b.docs-a.docs).slice(0,9);
    list.innerHTML=m.map(n=>`<li data-id="${n.id}"><i class="badge" style="--c:var(--${roleOf(n)});padding:0;width:8px;height:8px;border-radius:50%"></i>${n.label}<span class="muted">${n.docs} peças</span></li>`).join(""); list.hidden=!m.length; hl=-1;
    $$("li",list).forEach(li=>li.onclick=()=>{list.hidden=true;input.value=byId.get(li.dataset.id).label;onPick(li.dataset.id);}); };
  input.oninput=()=>suggest(input.value);
  input.onkeydown=e=>{const li=$$("li",list); if(e.key==="ArrowDown"){hl=Math.min(hl+1,li.length-1);} else if(e.key==="ArrowUp"){hl=Math.max(hl-1,0);} else if(e.key==="Enter"){e.preventDefault(); if(li[Math.max(hl,0)]) li[Math.max(hl,0)].click(); else {const ex=G.nodes.find(n=>n.label.toLowerCase()===input.value.trim().toLowerCase()); if(ex) onPick(ex.id);} return;} else if(e.key==="Escape"){list.hidden=true;return;} else return; li.forEach((l,i)=>l.classList.toggle("hl",i===hl));};
  document.addEventListener("click",e=>{if(!e.target.closest(".search")) list.hidden=true;});
}
attachSearch($("#search"),$("#sugg"),id=>{ ensureVisible(id); if(pathMode) pathClick(id); else select(id); });
/* caminho */
function setPathMode(on,preA){ pathMode=on; pathA=preA||null; pathSet=null; if(on){ selected=null; renderPanel(null); } const h=$("#pathHint"); h.hidden=!on; h.textContent=on?(pathA?`A = ${byId.get(pathA).label}. Agora clique (ou busque) o nó B.`:"Clique (ou busque) o nó A."):""; $("#pathBtn").classList.toggle("primary",on); refresh(); }
$("#pathBtn").onclick=()=>setPathMode(!pathMode);
/* nós vivos: física contínua (ForceAtlas2 em worker) + arrastar */
let live=null, dragging=null, spacing=22;
function fa2Settings(){ const FA=graphologyLibrary.layoutForceAtlas2; const st=FA.inferSettings(graph); return Object.assign(st,{gravity:Math.max(.2,1.4-spacing/50),scalingRatio:spacing,barnesHutOptimize:true,linLogMode:true,edgeWeightInfluence:.6,slowDown:3,adjustSizes:true}); }
function startLive(){ if(live) return; const W=graphologyLibrary.FA2Layout||(graphologyLibrary.layoutForceAtlas2&&graphologyLibrary.layoutForceAtlas2.FA2Layout); if(!W){ alert("Layout ao vivo indisponível nesta build."); return; } live=new W(graph,{settings:fa2Settings(),getEdgeWeight:"w"}); live.start(); }
function stopLive(){ if(!live) return; live.kill(); live=null; }
$("#liveLayout").onchange=e=>{ e.target.checked?startLive():stopLive(); };
$("#spacing").oninput=e=>{ spacing=+e.target.value; $("#spacingOut").textContent=spacing; if(live){ stopLive(); startLive(); } };
function bindDrag(){ if(!renderer) return;
  renderer.on("downNode",({node})=>{ dragging=node; graph.setNodeAttribute(node,"highlighted",true); renderer.getCamera().disable(); });
  renderer.getMouseCaptor().on("mousemovebody",e=>{ if(!dragging) return; const pos=renderer.viewportToGraph(e); graph.setNodeAttribute(dragging,"x",pos.x); graph.setNodeAttribute(dragging,"y",pos.y); e.preventSigmaDefault(); e.original.preventDefault(); e.original.stopPropagation(); });
  const up=()=>{ if(!dragging) return; graph.removeNodeAttribute(dragging,"highlighted"); dragging=null; renderer.getCamera().enable(); };
  renderer.getMouseCaptor().on("mouseup",up); renderer.getMouseCaptor().on("mouseleave",up); }
addEventListener("hashchange",()=>{ if(location.hash.slice(1)!=="grafo"&&location.hash.slice(1)!=="tour"&&live){ stopLive(); $("#liveLayout").checked=false; } });
function pathClick(id){ if(!pathA){pathA=id;$("#pathHint").textContent=`A = ${byId.get(id).label}. Agora clique (ou busque) o nó B.`;return;}
  const path=graphologyLibrary.shortestPath.bidirectional(graph,pathA,id);
  if(!path){$("#pathHint").textContent="Sem caminho entre os dois no grafo.";pathA=null;return;}
  const edges=new Set(); for(let i=0;i<path.length-1;i++) edges.add(graph.edge(path[i],path[i+1]));
  pathSet={nodes:new Set(path),edges}; $("#pathHint").innerHTML=`Caminho em ${path.length-1} passo(s): ${path.map(p=>byId.get(p).label).join(" → ")} <button class="btn small" id="pathClear" style="margin-left:8px">limpar</button>`;
  $("#pathClear").onclick=()=>setPathMode(false); pathA=null; refresh(); }

/* ---------- mapa mental (SVG radial, sem biblioteca) ---------- */
const mm={mode:null,center:null,proc:null,crumbs:[],n:8,vb:null,pan:null};
$("#mmMode").onchange=e=>{mm.mode=e.target.value; if(mm.mode==="entidade"&&!mm.center) mm.center=G.nodes.filter(n=>n.vis&&n.papel==="pessoa").sort((a,b)=>b.wdeg-a.wdeg)[0].id; if(mm.mode==="processo"&&!mm.proc) mm.proc="PET 15556"; drawMM();};
$("#mmN").oninput=e=>{mm.n=+e.target.value;$("#mmNOut").textContent=mm.n;drawMM();};
attachSearch($("#mmSearch"),$("#mmSugg"),id=>mmCenter(id));
function mmCenter(id){ mm.mode="entidade"; $("#mmMode").value="entidade"; if(mm.center&&mm.center!==id){mm.crumbs.push({t:"entidade",id:mm.center}); mm.crumbs=mm.crumbs.slice(-8);} mm.center=id; drawMM(); }
function mmProc(p){ mm.mode="processo"; $("#mmMode").value="processo"; if(mm.proc&&mm.proc!==p) mm.crumbs.push({t:"processo",id:mm.proc}); mm.proc=p; drawMM(); }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function branchesFor(){ // devolve [{label,color,items:[{id,label,w,size,papel}]}]
  const roles=["pessoa","empresa","autoridade","advogado"];
  if(mm.mode==="caso"){ const ps=[...PROCS].sort((a,b)=>b.pages-a.pages); return [{label:"Processos",color:css("--cyan"),items:ps.map(p=>({id:"proc:"+p.processo,label:p.processo,w:p.pdfs,sub:`${fmt(p.pages)} pág.`,size:6+Math.log2(p.pages+1)*1.3,color:css("--cyan")}))}]; }
  if(mm.mode==="processo"){ const p=mm.proc; return roles.map(r=>{const items=G.nodes.filter(n=>n.vis&&n.papel===r).map(n=>{const pe=n.pe.find(x=>x[0]===p); return pe?{id:n.id,label:n.label,w:pe[1],sub:`${pe[1]} peças`,size:5+Math.log2(pe[1]+1)*1.6,color:css("--"+r)}:null;}).filter(Boolean).sort((a,b)=>b.w-a.w).slice(0,mm.n); return {label:ROLE_PL[r],color:css("--"+r),items};}).filter(b=>b.items.length); }
  const c=mm.center; return roles.map(r=>{const items=graph.neighbors(c).map(m=>{const n=byId.get(m); if(!n.vis||n.papel!==r) return null; const w=graph.getEdgeAttribute(graph.edge(c,m),"w"); return {id:m,label:n.label,w,sub:`${w} peças em comum`,size:5+Math.log2(w+1)*1.8,color:css("--"+r)};}).filter(Boolean).sort((a,b)=>b.w-a.w).slice(0,mm.n); return {label:ROLE_PL[r],color:css("--"+r),items};}).filter(b=>b.items.length);
}
function drawMM(){ const svg=$("#mm"); const br=branchesFor(); const W=svg.clientWidth||1000,H=svg.clientHeight||600; if(!mm.vb) mm.vb=[-W/2,-H/2,W,H]; svg.setAttribute("viewBox",mm.vb.join(" "));
  const centerLabel=mm.mode==="caso"?"Operação Compliance Zero":mm.mode==="processo"?mm.proc:byId.get(mm.center).label;
  const centerColor=mm.mode==="caso"?css("--pink"):mm.mode==="processo"?css("--cyan"):css("--"+roleOf(byId.get(mm.center)));
  const total=br.reduce((s,b)=>s+b.items.length,0)||1; let ang=-Math.PI/2; const R1=Math.min(140,H*.28), R2=Math.min(W*.34,H*(mm.mode==='caso'?.38:.40))+20; let out=[];
  const path=(x1,y1,x2,y2)=>`M${x1},${y1} Q${(x1+x2)/2*1.08},${(y1+y2)/2*1.08} ${x2},${y2}`;
  $("#mmMode").value=mm.mode; const direct=mm.mode==="caso";
  br.forEach(b=>{ const span=2*Math.PI*(b.items.length/total); const mid=ang+span/2; const gx=direct?0:Math.cos(mid)*R1, gy=direct?0:Math.sin(mid)*R1;
    if(!direct) out.push(`<path class="mm-link" d="${path(0,0,gx,gy)}" stroke-width="3" style="stroke:${b.color};stroke-opacity:.6"/>`);
    b.items.forEach((it,i)=>{ const a=ang+span*((i+.5)/b.items.length); const x=Math.cos(a)*R2, y=Math.sin(a)*R2; const cls=it.w>=10?"w3":it.w>=4?"w2":"";
      out.push(`<path class="mm-link ${cls}" d="${path(gx,gy,x,y)}" stroke-width="${1+Math.min(4,Math.log2(it.w+1))}"${direct?` style="stroke:${it.color};stroke-opacity:.45"`:""}/>`);
      const anchor=Math.cos(a)>=0?"start":"end", dx=Math.cos(a)>=0?10:-10;
      out.push(`<g class="mm-node leaf" data-id="${esc(it.id)}" transform="translate(${x},${y})"><circle r="${it.size}" fill="${it.color}"/><text x="${dx}" y="4" text-anchor="${anchor}">${esc(it.label)}</text><text x="${dx}" y="18" text-anchor="${anchor}" style="font-size:10px;fill:var(--muted)">${esc(it.sub)}</text></g>`); });
    if(!direct) out.push(`<g class="mm-node group" transform="translate(${gx},${gy})"><circle r="16" fill="${b.color}" fill-opacity=".18" stroke="${b.color}"/><text y="-22" text-anchor="middle" style="fill:${b.color}">${b.label} · ${b.items.length}</text></g>`);
    ang+=span; });
  if(mm.mode==="processo"&&br.length<4){ const faltam=["pessoa","empresa","autoridade","advogado"].filter(r=>!br.some(b=>b.label===ROLE_PL[r])).map(r=>ROLE_PL[r].toLowerCase()); out.push(`<text y="${R2+40}" text-anchor="middle" style="font-size:11px;fill:var(--muted)">sem ${faltam.join(", ")} nas peças narrativas deste processo</text>`); }
  out.push(`<g class="mm-node center" data-center="1"><circle r="34" fill="${centerColor}"/><text y="-44" text-anchor="middle">${esc(centerLabel)}</text></g>`);
  svg.innerHTML=`<g id="mmRoot">${out.join("")}</g>`;
  $$(".leaf",svg).forEach(g=>g.onclick=()=>{const id=g.dataset.id; if(id.startsWith("proc:")) mmProc(id.slice(5)); else mmCenter(id);});
  $("[data-center]",svg).onclick=()=>{ if(mm.mode==="entidade") openNode(mm.center); else if(mm.mode==="processo"){ location.hash="grafo"; setTimeout(()=>{F.proc=mm.proc;$("#procSel").value=mm.proc;refresh();},60);} };
  $("#mmCrumbs").innerHTML=(mm.crumbs.length?`<span>anteriores:</span> `:"")+mm.crumbs.slice().reverse().map((c,i)=>`<button data-i="${mm.crumbs.length-1-i}">${c.t==="processo"?c.id:byId.get(c.id).label}</button>`).join("");
  $$("#mmCrumbs button").forEach(b=>b.onclick=()=>{const c=mm.crumbs[+b.dataset.i]; mm.crumbs=mm.crumbs.slice(0,+b.dataset.i); if(c.t==="processo"){mm.mode="processo";mm.proc=c.id;} else {mm.mode="entidade";mm.center=c.id;} $("#mmMode").value=mm.mode; drawMM();});
}
(function mmPanZoom(){ const svg=$("#mm"); let drag=null;
  svg.addEventListener("wheel",e=>{e.preventDefault(); const k=e.deltaY>0?1.1:0.9; const [x,y,w,h]=mm.vb; const r=svg.getBoundingClientRect(); const px=x+(e.clientX-r.left)/r.width*w, py=y+(e.clientY-r.top)/r.height*h; mm.vb=[px-(px-x)*k,py-(py-y)*k,w*k,h*k]; svg.setAttribute("viewBox",mm.vb.join(" "));},{passive:false});
  svg.addEventListener("mousedown",e=>{drag={x:e.clientX,y:e.clientY,vb:[...mm.vb]};});
  addEventListener("mousemove",e=>{ if(!drag) return; const r=svg.getBoundingClientRect(); const sx=drag.vb[2]/r.width, sy=drag.vb[3]/r.height; mm.vb=[drag.vb[0]-(e.clientX-drag.x)*sx,drag.vb[1]-(e.clientY-drag.y)*sy,drag.vb[2],drag.vb[3]]; svg.setAttribute("viewBox",mm.vb.join(" "));});
  addEventListener("mouseup",()=>{drag=null;}); addEventListener("resize",()=>{ if(mm.mode&&!$("#v-mapa").hidden){ mm.vb=null; drawMM(); } });
})();

/* ---------- processos (v2: tabela ordenável, detalhe, matriz de citações) ---------- */
const TIPO_COLORS=["#35D8F0","#FF4FA3","#B08CFF","#FFD37A","#4FE3A6","#FF9A5C","#FF6B86","#7FB2FF","#C3F73A","#9DB4FF"];
const tipoOrder=Object.entries(PROCS.reduce((m,p)=>{Object.entries(p.tipos).forEach(([t,n])=>m[t]=(m[t]||0)+n);return m;},{})).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
const tipoColor=t=>{const i=tipoOrder.indexOf(t); return i>=0&&i<TIPO_COLORS.length?TIPO_COLORS[i]:"var(--pseudo)";};
$("#procLegend").innerHTML=tipoOrder.slice(0,TIPO_COLORS.length).map(t=>`<span><i style="background:${tipoColor(t)}"></i>${tipo(t)}</span>`).join("")+`<span><i style="background:var(--pseudo)"></i>outros</span>`;
const PS={sort:"pages",open:null};
const kind=p=>p.startsWith("INQ")?"inquérito":p.startsWith("RCL")?"reclamação":"petição";
function renderProcs(){ const rows=[...PROCS].sort((a,b)=>PS.sort==="processo"?a.processo.localeCompare(b.processo):b[PS.sort]-a[PS.sort]); const mx=Math.max(...PROCS.map(p=>p[PS.sort==="pdfs"?"pdfs":"pages"]));
  const tb=$("#procTable tbody"); tb.innerHTML=rows.map(p=>{const tipos=Object.entries(p.tipos).sort((a,b)=>b[1]-a[1]); const tot=tipos.reduce((s,x)=>s+x[1],0)||1; const top=p.top.slice(0,3);
    const det=PS.open===p.processo?`<tr class="detail"><td colspan="8"><div class="pd"><div><h4>Composição por tipo de peça</h4><div class="bars">${tipos.slice(0,8).map(([t,n])=>`<div class="bar"><span>${tipo(t)}</span><i style="width:${(n/tipos[0][1])*100}%;background:${tipoColor(t)}"></i><span>${n}</span></div>`).join("")}</div></div>
      <div><h4>Quem mais aparece</h4><div class="tops">${p.top.map(([l,r,n])=>{const id=byLabel.get(l)?.id; return `<button data-open="${id||""}" style="--c:var(--${id?roleOf(byId.get(id)):r})"><i></i>${l} <span class="muted">${n}</span></button>`;}).join("")}</div></div>
      <div><h4>Abrir</h4><div class="acts"><button class="btn small" data-graph="${p.processo}">Só este processo no grafo</button><button class="btn small" data-mmp="${p.processo}">Mapa mental</button><button class="btn ghost small" data-tl="${p.processo}">Linha do tempo</button></div><p class="muted" style="margin-top:8px">Cita: ${(xg[p.processo]||[]).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([d,n])=>`${d} (${n})`).join(", ")||"—"}</p></div></div></td></tr>`:"";
    return `<tr class="row ${PS.open===p.processo?"open":""}" data-p="${p.processo}"><td class="pid">${p.processo}</td><td><span class="tt">${kind(p.processo)}</span></td><td class="n">${fmt(p.pdfs)}</td><td class="n">${fmt(p.pages)}</td><td><div class="vbar" style="width:${(p[PS.sort==="pdfs"?"pdfs":"pages"]/mx)*100}%"></div></td><td><div class="comp" title="${tipos.slice(0,5).map(([t,n])=>`${tipo(t)}: ${n}`).join(" · ")}">${tipos.map(([t,n])=>`<i style="width:${(n/tot)*100}%;background:${tipoColor(t)}"></i>`).join("")}</div></td><td><div class="tops">${top.map(([l,r,n])=>{const id=byLabel.get(l)?.id; return `<button data-open="${id||""}" style="--c:var(--${id?roleOf(byId.get(id)):r})"><i></i>${l}</button>`;}).join("")}</div></td><td class="muted">${PS.open===p.processo?"▲":"▼"}</td></tr>${det}`;}).join("");
  $$("tr.row",tb).forEach(tr=>tr.onclick=e=>{ if(e.target.closest("button")) return; PS.open=PS.open===tr.dataset.p?null:tr.dataset.p; renderProcs(); });
  $$("[data-open]",tb).forEach(b=>b.onclick=()=>{ if(b.dataset.open) openNode(b.dataset.open); });
  $$("[data-mmp]",tb).forEach(b=>b.onclick=()=>{ mmProc(b.dataset.mmp); location.hash="mapa"; });
  $$("[data-graph]",tb).forEach(b=>b.onclick=()=>{ location.hash="grafo"; setTimeout(()=>{F.proc=b.dataset.graph;$("#procSel").value=b.dataset.graph;F.topN=0;$("#topN").value="0";refresh();renderer&&renderer.getCamera().animatedReset({duration:400});},60); });
  $$("[data-tl]",tb).forEach(b=>b.onclick=()=>{ location.hash="tempo"; setTimeout(()=>{$("#tlProc").value=b.dataset.tl;drawTL();},60); });
}
$$("#v-processos [data-sort]").forEach(c=>c.onclick=()=>{ $$("#v-processos [data-sort]").forEach(x=>x.classList.toggle("on",x===c)); PS.sort=c.dataset.sort; renderProcs(); });
const xg={}; XREF.forEach(({s,d,n})=>{(xg[s]=xg[s]||[]).push([d,n]);});
(function xrefMatrix(){ const ps=META.corpus.processos; const M={}; XREF.forEach(({s,d,n})=>{M[s+"|"+d]=n;}); const mx=Math.max(1,...XREF.map(x=>x.n));
  $("#xrefMatrix").innerHTML=`<tr><th></th>${ps.map(p=>`<th class="rot">${p}</th>`).join("")}</tr>`+ps.map(r=>`<tr><th>${r}</th>${ps.map(c=>{ if(r===c) return `<td class="self">·</td>`; const n=M[r+"|"+c]||0; const a=n?0.12+0.88*Math.sqrt(n/mx):0; return `<td title="${r} cita ${c}: ${n} peças" style="background:color-mix(in srgb,var(--pink) ${Math.round(a*100)}%,var(--bg2));color:${a>.5?"#fff":"var(--ink)"}">${n||""}</td>`;}).join("")}</tr>`).join("");
})();
renderProcs();

/* ---------- linha do tempo ---------- */
const tlProc=$("#tlProc"); META.corpus.processos.forEach(p=>tlProc.insertAdjacentHTML("beforeend",`<option>${p}</option>`));
function months(){const out=[]; for(let y=2015;y<=2026;y++) for(let m=1;m<=12;m++){const k=`${y}-${String(m).padStart(2,"0")}`; if(k>"2026-09") break; out.push(k);} return out;}
function drawTL(){ const ms=months(), proc=tlProc.value, log=$("#tlLog").checked;
  const val=ms.map(k=>{const d=TL[k]||{}; return proc?(d[proc]||0):Object.values(d).reduce((a,b)=>a+b,0);});
  const tr=v=>log?Math.log10(v+1):v; const mx=Math.max(1,...val.map(tr)); const W=1400,H=320,pad=30,bw=(W-pad*2)/ms.length;
  $("#tlChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="tlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${css("--pink")}"/><stop offset="1" stop-color="${css("--cyan")}"/></linearGradient></defs>${ms.map((k,i)=>{const h=(tr(val[i])/mx)*(H-60); const isJan=k.endsWith("-01"); return `<rect x="${pad+i*bw+1}" y="${H-40-h}" width="${bw-2}" height="${h}" fill="url(#tlg)" data-k="${k}"></rect>${isJan?`<text x="${pad+i*bw}" y="${H-22}" font-size="11" fill="${css("--muted")}">${k.slice(0,4)}</text>`:""}`;}).join("")}</svg>`;
  $$("#tlChart rect").forEach(r=>r.onmouseenter=()=>{const k=r.dataset.k, d=TL[k]||{}; const top=Object.entries(d).sort((a,b)=>b[1]-a[1]).slice(0,5); $("#tlDetail").innerHTML=`<b>${k}</b> · ${fmt(val[ms.indexOf(k)])} datas citadas${top.length?" · "+top.map(([p,n])=>`${p} (${fmt(n)})`).join(", "):""}`;});
}
tlProc.onchange=drawTL; $("#tlLog").onchange=drawTL; drawTL();

/* ---------- tour guiado (sem quiz): cada passo configura o grafo e diz o que olhar ---------- */
const topBy=(pred,key="wdeg")=>G.nodes.filter(pred).sort((a,b)=>b[key]-a[key]);
const centerPessoa=topBy(n=>n.vis&&n.papel==="pessoa")[0];
const topEmpresa=topBy(n=>n.papel==="empresa")[0];
const biggestProc=[...PROCS].sort((a,b)=>b.pages-a.pages)[0];
const empresas5=G.nodes.filter(n=>n.papel==="empresa"&&n.procs>=5).length;
const secondCluster=topBy(n=>n.vis&&n.papel==="pessoa"&&n.c!==centerPessoa.c)[0];
const strongest=(id,role)=>graph.neighbors(id).map(m=>[m,graph.getEdgeAttribute(graph.edge(id,m),"w")]).filter(([m])=>byId.get(m).papel===role).sort((a,b)=>b[1]-a[1])[0];
const STEPS=[
 {t:"O acervo em 30 segundos",b:`Em 10 de setembro de 2026 o relator, ministro <strong>André Mendonça</strong>, retirou o sigilo da Petição 15.556 e de quatorze procedimentos ligados à <strong>Operação Compliance Zero</strong>, a pedido da presidência do STF. No dia seguinte o Tribunal publicou tudo: <strong>${fmt(META.corpus.pdfs)} peças</strong>, <strong>${fmt(META.corpus.paginas)} páginas</strong>. Ninguém lê isso na íntegra. Este site extrai do texto quem aparece, em que papel e ao lado de quem, e devolve cada afirmação à sua página de origem.`,
  tip:"O que este site é: um índice de relações com fonte. O que não é: cópia dos documentos, lista de CPFs, ou conclusão sobre culpa de quem quer que seja.",widget:"caso"},
 {t:"Quinze processos, um caso",b:`O material não é um processo só. São inquéritos (INQ), petições (PET) e uma reclamação (RCL) que se citam mutuamente. Os volumes são muito desiguais: a <strong>${biggestProc.processo}</strong> sozinha tem ${fmt(biggestProc.pages)} páginas, quase tudo mídia de DVD com autos de processos federais anexados como prova. No mapa abaixo, o tamanho do círculo é o número de páginas. Clique num processo para ver quem domina cada um.`,
  tip:"Volume não é importância. A peça decisiva de um caso pode ter cinco páginas.",widget:"caso"},
 {t:"Quem é quem: quatro papéis",b:`Cada nó recebe um papel inferido do próprio texto. <strong>Empresa</strong>: termo societário no nome. <strong>Autoridade</strong>: cargo no contexto, ou assinatura em todas as páginas de uma peça longa. <strong>Advogado</strong>: remetente do recibo de petição eletrônica, ou inscrição profissional junto ao nome. <strong>Pessoa</strong>: o resto. Advogados ficam ocultos por padrão: assinam juntos as mesmas petições e formam blocos densos que só dizem "trabalham no mesmo escritório".`,
  tip:"Ligue o filtro Advogados na barra do grafo para ver o bloco denso aparecer. Depois desligue.",widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=4;F.proc="";syncChips();select(null);refresh();renderer&&renderer.getCamera().animatedReset({duration:400});}},
 {t:"O centro do grafo",b:`O nó com mais conexões ponderadas entre as pessoas é <strong>${centerPessoa.label}</strong>: ${centerPessoa.procs} dos 15 processos, ${fmt(centerPessoa.docs)} peças narrativas. A ficha ao lado lista com quem ele mais divide páginas. A empresa mais próxima é <strong>${byId.get(strongest(centerPessoa.id,"empresa")[0]).label}</strong>, com ${strongest(centerPessoa.id,"empresa")[1]} peças em comum.`,
  tip:"Passe o mouse sobre qualquer nó para acender só a vizinhança dele. Clique para trocar a ficha.",widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=3;syncChips();select(centerPessoa.id);}},
 {t:"Siga as empresas",b:`Filtrar só empresas revela a espinha dorsal societária do caso: bancos, gestoras, holdings e veículos de investimento que se repetem entre processos diferentes. Uma empresa presente em muitos processos é um fio condutor. Ao todo, <strong>${empresas5}</strong> empresas aparecem em cinco ou mais processos.`,
  tip:"Recorrência entre processos é sinal. Volume dentro de um único processo, quase sempre, é só um anexo grande.",widget:"graph",setup(){F.roles=new Set(["empresa"]);F.minDocs=3;syncChips();select(null);refresh();renderer&&renderer.getCamera().animatedReset({duration:400});}},
 {t:"Caminho entre dois nomes",b:`A pergunta clássica de apuração: <em>o que liga A a B?</em> O grafo responde com o caminho mais curto. O modo caminho já está armado com <strong>${centerPessoa.label}</strong> como A. Clique em <strong>${secondCluster.label}</strong>, que está em outro núcleo, para ver as pontes.`,
  tip:"Os nós intermediários de um caminho são os que valem uma leitura de peça.",widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=2;syncChips();select(null);setPathMode(true,centerPessoa.id);focus(secondCluster.id,.35);}},
 {t:"O mapa mental",b:`Quando o grafo inteiro é demais, o mapa mental parte de um nome e abre os vínculos dele por categoria, ramo a ramo. Abaixo, <strong>${topEmpresa.label}</strong> no centro. Clique em qualquer ramo para recentrar nele e seguir o fio; os anteriores ficam como trilha de migalhas.`,
  tip:"Use o mapa para uma apuração linear: de quem para quem. Use o grafo para ver o desenho de conjunto.",widget:"mm",setup(){mm.mode="entidade";mm.center=topEmpresa.id;mm.crumbs=[];}},
 {t:"Ler a fonte, e agora é com você",b:`Nada aqui é conclusão. Cada ficha tem uma tabela "Onde conferir" com <strong>processo, seq e página</strong>. O <em>seq</em> é o número sequencial da peça no processo, e é o início do nome do arquivo na pasta correspondente do pacote público do STF. Sugestões para começar: quem são as pontes entre núcleos? Que empresa aparece em processos que não se citam? Quais autoridades assinam peças em mais de um processo?`,
  tip:"Encontrou erro de identificação ou de papel? Abra uma issue no repositório. A política é corrigir rápido.",widget:"graph",setup(){F.roles=new Set(["pessoa","empresa","autoridade"]);F.minDocs=3;syncChips();setPathMode(false);select(topEmpresa.id);},done:true}
];
let T={cur:0,done:[]}; try{T={...T,...JSON.parse(localStorage.getItem("bmdb.tour")||"{}")}}catch(e){}
function saveT(){try{localStorage.setItem("bmdb.tour",JSON.stringify(T))}catch(e){}}
function renderRail(){$("#railSteps").innerHTML=STEPS.map((s,i)=>`<li class="${i===T.cur?"cur":""} ${T.done.includes(i)?"done":""}" data-i="${i}"><span class="n">${T.done.includes(i)?"✓":i+1}</span>${s.t}</li>`).join(""); $$("#railSteps li").forEach(li=>li.onclick=()=>{T.cur=+li.dataset.i;saveT();renderStep();});}
function parkGraph(){ const gw=$(".graph-wrap"); if(gw&&gw.parentElement!==$("#v-grafo")) $("#v-grafo").appendChild(gw); const mw=$(".mm-wrap"); if(mw&&mw.parentElement!==$("#v-mapa")&&!$("#mmToggle").checked) $("#v-mapa").appendChild(mw); }
function renderStep(){ const i=T.cur, s=STEPS[i]; if(!T.done.includes(i)){T.done.push(i);saveT();} renderRail(); $("#stepNum").textContent=`Passo ${i+1} de ${STEPS.length}`; $("#stepTitle").textContent=s.t; $("#stepBody").innerHTML=s.b; $("#stepTip").textContent=s.tip||"";
  const W=$("#stepWidget"); parkGraph(); W.innerHTML="";
  if(s.widget==="graph"){ const holder=document.createElement("div"); holder.className="mini"; W.appendChild(holder); mountGraph($(".graph-wrap"),holder); setTimeout(()=>{renderer.refresh(); s.setup&&s.setup();},80); }
  else if(s.widget==="mm"||s.widget==="caso"){ const holder=document.createElement("div"); holder.className="mini"; W.appendChild(holder); holder.appendChild($(".mm-wrap")); if(s.widget==="caso"){mm.mode="caso";} else s.setup&&s.setup(); mm.vb=null; setTimeout(drawMM,50); }
  $("#prevStep").disabled=i===0; $("#nextStep").textContent=i===STEPS.length-1?"Ir para o grafo →":"Próximo →";
}
$("#prevStep").onclick=()=>{T.cur=Math.max(0,T.cur-1);saveT();renderStep();};
$("#nextStep").onclick=()=>{ if(T.cur===STEPS.length-1){location.hash="grafo";return;} T.cur++; saveT(); renderStep(); };
$("#resetTrail").onclick=()=>{T={cur:0,done:[]};saveT();renderStep();};
addEventListener("hashchange",()=>{ if(location.hash.slice(1)!=="tour") parkGraph(); if(location.hash.slice(1)!=="grafo"&&$("#mmToggle").checked){ $("#mmToggle").checked=false; $("#v-grafo").classList.remove("mm-in-graph"); $("#v-mapa").appendChild($(".mm-wrap")); } });

/* ---------- personagens (wiki) ---------- */
const WK={roles:new Set(["pessoa","empresa","autoridade"]),q:"",open:null};
const wkBy=new Map(WIKI.pages.map(p=>[p.id,p]));
$$("#wkChips .chip").forEach(c=>c.onclick=()=>{const r=c.dataset.role; WK.roles.has(r)?WK.roles.delete(r):WK.roles.add(r); c.classList.toggle("on",WK.roles.has(r)); renderWiki();});
$("#wkSearch").oninput=e=>{WK.q=e.target.value.trim().toLowerCase();renderWiki();};
function openWiki(id){ WK.open=id; location.hash="personagens"; setTimeout(renderWiki,30); }
function renderWiki(){ const grid=$("#wkGrid"), pg=$("#wkPage");
  if(WK.open&&wkBy.has(WK.open)){ const p=wkBy.get(WK.open); grid.hidden=true; pg.hidden=false;
    const roleBlock=(r,t)=>p.byrole[r]?`<h4>${t}</h4><div class="neigh">${p.byrole[r].map(x=>`<button data-wk="${x.id}" style="--c:var(--${byId.get(x.id)?roleOf(byId.get(x.id)):r})"><i></i>${x.label}<span class="muted">${x.w}</span></button>`).join("")}</div>`:"";
    pg.innerHTML=`<button class="btn ghost small" id="wkBack">← todos os personagens</button><h2 style="margin-top:12px">${p.label}</h2><span class="badge" style="--c:var(--${p.papel})">${ROLE_LABEL[p.papel]}</span>
      <div class="kv" style="max-width:420px"><div><b>${fmt(p.docs)}</b><span>peças</span></div><div><b>${p.procs}</b><span>processos</span></div><div><b>${fmt(p.mentions)}</b><span>menções</span></div></div>
      <p>${p.resumo}</p>
      <div class="acts"><button class="btn small" data-open="${p.id}">Abrir no grafo</button><button class="btn small" data-mmc="${p.id}">Mapa mental</button><a class="btn ghost small" href="https://github.com/LLA-master/autos-abertos/blob/main/wiki/${p.slug}.md" target="_blank" rel="noopener">Ficha em Markdown</a></div>
      <div class="wk-cols"><div><h4>Presença por processo</h4><div class="bars">${p.pe.slice(0,8).map(([pr,c])=>`<div class="bar"><span>${pr}</span><i style="width:${(c/Math.max(1,p.pe[0][1]))*100}%"></i><span>${c}</span></div>`).join("")}</div>${spark(p.tl||{})}
      ${roleBlock("pessoa","Aparece junto de · pessoas")}${roleBlock("empresa","Empresas")}${roleBlock("autoridade","Autoridades")}${roleBlock("advogado","Advogados")}</div>
      <div><h4>Tipos de peça</h4><ul>${p.tipos.map(([t,c])=>`<li>${tipo(t)} <span class="muted">(${c})</span></li>`).join("")}</ul>
      <h4>Onde conferir</h4><table><tr><th>processo</th><th>seq</th><th>peça</th><th>pág.</th></tr>${p.cit.map(([a,b,c,d])=>`<tr><td>${a}</td><td>${String(b).padStart(5,"0")}</td><td>${tipo(c)}</td><td>${d}</td></tr>`).join("")}</table></div></div>
      <p class="muted" style="margin-top:12px">Ficha automática a partir dos dados públicos sanitizados. Coocorrência na mesma página não prova relação. Erros de identificação: abra uma issue.</p>`;
    $("#wkBack").onclick=()=>{WK.open=null;renderWiki();}; $$("[data-wk]",pg).forEach(b=>b.onclick=()=>openWiki(b.dataset.wk)); $("[data-open]",pg).onclick=()=>openNode(p.id); $("[data-mmc]",pg).onclick=()=>{mmCenter(p.id);location.hash="mapa";};
    window.scrollTo({top:0}); return; }
  pg.hidden=true; grid.hidden=false;
  const xs=WIKI.pages.filter(p=>WK.roles.has(p.papel)&&(!WK.q||p.label.toLowerCase().includes(WK.q)));
  grid.innerHTML=xs.map(p=>`<div class="wk-card" data-wk="${p.id}" style="--c:var(--${p.papel})"><span class="badge" style="--c:var(--${p.papel})">${ROLE_LABEL[p.papel]}</span><h3>${p.label}</h3><div class="m">${p.docs} peças · ${p.procs} processos${p.peak?` · pico ${p.peak}`:""}</div><p>${p.resumo}</p></div>`).join("")||`<p class="muted">Nada com esse filtro.</p>`;
  $$("[data-wk]",grid).forEach(c=>c.onclick=()=>openWiki(c.dataset.wk));
}
/* ---------- go ---------- */
show(location.hash.slice(1)||"inicio");
})();
