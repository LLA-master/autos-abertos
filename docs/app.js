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
$("#themeBtn").onclick=()=>{root.dataset.theme=isDark()?"light":"dark";try{localStorage.setItem("bmdb.theme",root.dataset.theme)}catch(e){};themeBtn();if(renderer){applyColors();renderer.setSetting("labelColor",{color:css("--label")});renderer.refresh();} if(mm.mode) drawMM(); if(!$("#v-rede").hidden) renderRede(); drawTL();};

/* ---------- dados ---------- */
const load=async f=>(await fetch("data/"+f)).json();
const [G,ENT,PROCS,XREF,TL,CNPJS,META,WIKI]=await Promise.all(["graph.json","entities.json","processos.json","crossrefs.json","timeline.json","cnpjs.json","meta.json","wiki.json"].map(load));
const byId=new Map(G.nodes.map(n=>[n.id,n]));
const byLabel=new Map(G.nodes.map(n=>[n.label,n]));
const roleOf=n=>n.vis?n.papel:"pseudo";
const colorOf=n=>css("--"+roleOf(n));

/* ---------- roteador ---------- */
const views=["inicio","tour","grafo","mapa","personagens","rede","processos","tempo","cronicas","metodo","avisos"];
let pendingQS=null;
function show(v){ v=v||""; if(v.includes("?")){ const i=v.indexOf("?"); pendingQS=v.slice(i+1); v=v.slice(0,i); if(v!=="cronicas") history.replaceState(null,"","#"+v); } if(!views.includes(v)) v="inicio";
  views.forEach(x=>{$("#v-"+x).hidden=(x!==v)});
  $$("[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===v));
  if(v==="grafo"){ mountGraph($(".graph-wrap"),$("#v-grafo")); if(pendingQS){ const q=pendingQS; pendingQS=null; setTimeout(()=>applyQS(q),80); } }
  if(v==="tour") renderStep();
  if(v==="mapa"){ if(!mm.mode){mm.mode="caso";} drawMM(); }
  if(v==="personagens") renderWiki();
  if(v==="rede") renderRede();
  if(v==="cronicas"){ renderCronicas(pendingQS); pendingQS=null; }
  window.scrollTo({top:0});
}
addEventListener("hashchange",()=>show(location.hash.slice(1)));
$$(".tb-toggle").forEach(b=>b.onclick=()=>{const t=b.closest(".toolbar"); t.classList.toggle("open"); b.textContent=t.classList.contains("open")?"Menos filtros ▴":"Filtros ▾";});
function drawer(open){ const d=$("#tbDrawer"); d.hidden=!open; $("#tbMore").setAttribute("aria-expanded",String(open)); $("#tbMore").textContent=open?"Ajustes ▴":"Ajustes ▾"; document.body.classList.toggle("drawer-open",open); }
$("#tbMore").onclick=()=>drawer($("#tbDrawer").hidden); $("#tbClose").onclick=()=>drawer(false);
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("#tbDrawer").hidden) drawer(false); });
$$("[data-nav]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();location.hash=a.dataset.nav;}));

/* ---------- início ---------- */
$("#tiles").innerHTML=[[META.corpus.paginas,"páginas"],[META.corpus.pdfs,"peças (PDF)"],[META.corpus.processos.length,"processos"],[META.grafo.nos,"nós no grafo"],[META.grafo.arestas,"relações"],[META.grafo.pseudonimizados,"pessoas pseudonimizadas"],[META.grafo.docs_narrativos||0,"peças narrativas lidas para o grafo"]].map(([b,s])=>`<div class="tile"><b>${fmt(b)}</b><span>${s}</span></div>`).join("");
$("#buildInfo").textContent=`Dados gerados em ${META.gerado_em}. Pacote de origem: ${META.fonte.pacote}, ${fmt(META.fonte.bytes)} bytes, modificado em ${META.fonte.last_modified}.`;

/* ---------- grafo ---------- */
const graph=new graphology.Graph({type:"undirected"});
G.nodes.forEach(n=>graph.addNode(n.id,{x:n.x,y:n.y,size:2.5+Math.log2(n.docs+1)*1.7,label:n.label,color:"#999",n}));
G.edges.forEach(e=>{const s=G.nodes[e.s].id,d=G.nodes[e.d].id; if(!graph.hasEdge(s,d)) graph.addEdge(s,d,{w:e.w,p:e.p,l:e.l||1,dist:1/e.w,size:.35+Math.log2(e.w)*.55});});
let commColor=false;
function applyColors(){graph.forEachNode((id,a)=>graph.setNodeAttribute(id,"color",commColor&&a.n.c>=0?COMM[a.n.c%COMM.length]:colorOf(a.n)));}
applyColors();
(function layout(){ const key="bmdb.layout3."+META.gerado_em; let cached=null; try{cached=JSON.parse(localStorage.getItem(key)||"null")}catch(e){}
  if(cached&&Object.keys(cached).length===graph.order){ graph.forEachNode(id=>{const p=cached[id]; if(p){graph.setNodeAttribute(id,"x",p[0]);graph.setNodeAttribute(id,"y",p[1]);}}); return; }
  const FA=graphologyLibrary.layoutForceAtlas2; const settings=FA.inferSettings(graph); Object.assign(settings,{gravity:.25,scalingRatio:60,strongGravityMode:false,barnesHutOptimize:true,adjustSizes:true,linLogMode:true,edgeWeightInfluence:.5,slowDown:2});
  FA.assign(graph,{iterations:800,settings,getEdgeWeight:"w"});
  graphologyLibrary.layoutNoverlap.assign(graph,{maxIterations:300,settings:{margin:14,ratio:1.6,expansion:1.3}});
  const out={}; graph.forEachNode((id,a)=>out[id]=[+a.x.toFixed(2),+a.y.toFixed(2)]); try{localStorage.setItem(key,JSON.stringify(out))}catch(e){}
})();
const F={roles:new Set(["pessoa","empresa","autoridade"]),proc:"",minDocs:4,minW:2,topN:120,collapse:false,focus:false,depth:1,labelsAll:false,wMode:"bruto",minL:5,sizeBy:"docs",edgeColor:"discretas",comm:null,period:null};
let ETL=null; const dyn={bt:null,pr:null};
const qOf=m=>m.slice(0,4)+"T"+Math.ceil(+m.slice(5,7)/3);
function periodOK(e){ if(!F.period||!ETL) return true; const [a,b]=graph.extremities(e); const i=byId.get(a).i,j=byId.get(b).i; const t=ETL[`${i}|${j}`]||ETL[`${j}|${i}`]; if(!t) return false; let n=0; for(const q in t){ if(q>=F.period[0]&&q<=F.period[1]) n+=t[q]; } return n>=2; }
function edgeOK(e,a){ a=a||graph.getEdgeAttributes(e); return a.w>=F.minW&&(F.wMode!=="especifico"||a.l>=F.minL)&&periodOK(e); }
function hasActiveEdge(id){ for(const e of graph.edges(id)){ if(edgeOK(e)){ const [s,d]=graph.extremities(e); if(baseVisible(s===id?d:s)) return true; } } return false; }
function edgeBase(s,d,a,baseE){ if(F.edgeColor==="nucleo"){ const cs=byId.get(s).c, cd=byId.get(d).c; if(cs===cd&&cs>=0) return COMM[cs%COMM.length]+(isDark()?"66":"88"); return baseE; } if(F.edgeColor==="procs"){ return a.p>=3?css("--pink")+"88":a.p===2?css("--cyan")+"77":baseE; } return baseE; }
const hiddenSet=new Set(); let topSet=null, focusSet=null;
let renderer=null, hovered=null, selected=null, pathMode=false, pathA=null, pathSet=null, pickKind="path";
function baseVisible(id){const n=byId.get(id); if(hiddenSet.has(id)) return false; if(F.comm!==null&&n.c!==F.comm) return false; if(!F.roles.has(roleOf(n))) return false; if(n.docs<F.minDocs) return false; if(F.proc && !n.pe.some(([p])=>p===F.proc)) return false; if(topSet&&!topSet.has(id)) return false; return true;}
function visible(id){ if(!baseVisible(id)) return false; if(focusSet&&!focusSet.has(id)) return false; if(F.period&&ETL&&id!==selected&&!hasActiveEdge(id)) return false; if(F.collapse){ let d=0; for(const m of graph.neighbors(id)){ if(baseVisible(m)&&(!focusSet||focusSet.has(m))&&edgeOK(graph.edge(id,m))){ d++; if(d>1) break; } } if(d<=1 && id!==selected) return false; } return true;}
function recompute(){ topSet=F.topN?new Set(G.nodes.slice().sort((a,b)=>b.docs-a.docs).slice(0,F.topN).map(n=>n.id)):null;
  if(F.focus&&selected){ const set=new Set([selected]); let frontier=[selected]; for(let k=0;k<F.depth;k++){ const nx=[]; frontier.forEach(u=>graph.neighbors(u).forEach(v=>{ if(!set.has(v)&&edgeOK(graph.edge(u,v))){set.add(v);nx.push(v);} })); frontier=nx; } focusSet=set; } else focusSet=null; }
function reducers(){
  const focusId=hovered||selected; const neigh=focusId?new Set([focusId,...graph.neighbors(focusId)]):null;
  const dim=css("--node-dim"), dimE=css("--edge-dim"), baseE=css("--edge");
  return {
    nodeReducer(id,a){const r={...a}; if(!visible(id)){r.hidden=true;return r;}
      if(pathSet){ if(!pathSet.nodes.has(id)){r.color=dim;r.label="";} else {r.zIndex=2;r.highlighted=true;r.forceLabel=true;} return r;}
      if(neigh){ if(!neigh.has(id)){r.color=dim;r.label="";} else {r.zIndex=2;r.forceLabel=true;} }
      if(F.labelsAll) r.forceLabel=true;
      if(selected===id){r.highlighted=true;r.zIndex=3;r.size=a.size*1.35;r.forceLabel=true;} return r;},
    edgeReducer(e,a){const r={...a}; const [s,d]=graph.extremities(e); if(!visible(s)||!visible(d)||!edgeOK(e,a)){r.hidden=true;return r;}
      if(F.wMode==="especifico") r.size=.3+Math.log2(Math.max(1,a.l))*.3;
      r.color=edgeBase(s,d,a,baseE);
      if(pathSet){ if(pathSet.edges.has(e)){r.color=css("--hl");r.size=a.size*2.2;r.zIndex=2;} else r.color=dimE; return r;}
      if(neigh){ if(s===focusId||d===focusId){r.color=css("--hl");r.size=a.size*1.6;r.zIndex=1;} else r.color=dimE; } return r;}
  };
}
/* rótulo com pastilha de fundo: legível sobre nós densos, nos dois temas */
function drawLabel(ctx,data,settings){ if(!data.label) return; const size=settings.labelSize, font=settings.labelFont; ctx.font=`600 ${size}px ${font}`;
  const pad=5, w=ctx.measureText(data.label).width+pad*2, x=data.x+data.size+3, y=data.y; const h=size+6;
  ctx.fillStyle=css("--label-bg"); ctx.beginPath(); ctx.roundRect(x,y-h/2,w,h,5); ctx.fill();
  ctx.fillStyle=data.highlighted?css("--hl"):css("--label"); ctx.fillText(data.label,x+pad,y+size*.36);
  if(data.highlighted){ ctx.beginPath(); ctx.arc(data.x,data.y,data.size+3,0,Math.PI*2); ctx.strokeStyle=css("--hl"); ctx.lineWidth=3; ctx.stroke(); } }
function drawHover(ctx,data,settings){ const size=settings.labelSize, font=settings.labelFont; ctx.font=`700 ${size+1}px ${font}`; const label=data.label||""; const pad=7, w=ctx.measureText(label).width+pad*2, h=size+12; const x=data.x+data.size+3, y=data.y;
  ctx.fillStyle=css("--bg2"); ctx.strokeStyle=css("--hl"); ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(x,y-h/2,w,h,7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(data.x,data.y,data.size+3,0,Math.PI*2); ctx.strokeStyle=css("--hl"); ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle=css("--label"); ctx.fillText(label,x+pad,y+(size+1)*.36); }
let ED=null; async function loadED(){ if(!ED){ ED={}; try{ ED=await load("edges_detail.json"); }catch(e){} } return ED; }
const edgeKey=(a,b)=>{const i=byId.get(a).i,j=byId.get(b).i; return ED&&(ED[`${i}|${j}`]||ED[`${j}|${i}`])||null;};
const tipoSummary=d=>d?Object.entries(d.tipos).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${tipo(t)} (${n})`).join(" · "):"";
const tip=document.createElement("div"); tip.className="tip"; tip.hidden=true; document.body.appendChild(tip);
function showTip(html,x,y){ tip.innerHTML=html; tip.hidden=false; const r=tip.getBoundingClientRect(); tip.style.left=Math.min(innerWidth-r.width-12,x+14)+"px"; tip.style.top=Math.max(8,y-r.height-12)+"px"; }
function hideTip(){ tip.hidden=true; }
function renderEdgePanel(a,b){ const P=$("#panel"); const d=edgeKey(a,b)||{tipos:{},cit:[]}; const w=graph.getEdgeAttribute(graph.edge(a,b),"w"), pr=graph.getEdgeAttribute(graph.edge(a,b),"p");
  P.innerHTML=`<button class="close" aria-label="Fechar">×</button><h3 style="font-size:17px">${byId.get(a).label} <span class="muted">↔</span> ${byId.get(b).label}</h3>
  <p class="muted" style="margin:4px 0 10px">Natureza da ligação: os dois nomes aparecem <b>na mesma página</b> de ${w} peça(s) narrativa(s), em ${pr} processo(s). Isso é coocorrência documental, não prova de relação; a lista abaixo diz onde ler.</p>
  <div class="kv"><div><b>${w}</b><span>peças em comum</span></div><div><b>${pr}</b><span>processos</span></div><div><b>${Object.keys(d.tipos).length}</b><span>tipos de peça</span></div></div>
  <h4>Por tipo de peça</h4><div>${Object.entries(d.tipos).sort((x,y)=>y[1]-x[1]).map(([t,n])=>`<span class="tag">${tipo(t)} · ${n}</span>`).join("")||"<span class='muted'>sem detalhe</span>"}</div>
  <h4>Onde conferir (páginas em que ambos aparecem)</h4><table><tr><th>processo</th><th>seq</th><th>peça</th><th>pág.</th><th>×</th></tr>${d.cit.map(([pp,sq,t,pg,n])=>`<tr><td>${pp}</td><td>${String(sq).padStart(5,"0")}</td><td>${tipo(t)}</td><td>${pg}</td><td>${n}</td></tr>`).join("")}</table>
  <div class="acts" style="margin-top:10px"><button class="btn small" data-go="${a}">${byId.get(a).label}</button><button class="btn small" data-go="${b}">${byId.get(b).label}</button></div>`;
  P.hidden=false; $(".close",P).onclick=()=>{P.hidden=true;}; $$("[data-go]",P).forEach(x=>x.onclick=()=>{ensureVisible(x.dataset.go);select(x.dataset.go);}); }
function mountGraph(wrap,into){
  if(wrap.parentElement!==into) into.appendChild(wrap);
  if(!renderer){ loadED();
    renderer=new Sigma(graph,$("#sigma"),{allowInvalidContainer:true,renderEdgeLabels:false,labelRenderedSizeThreshold:10,labelDensity:.08,labelGridCellSize:70,labelFont:"Outfit, Inter, sans-serif",labelSize:13,labelWeight:"600",labelColor:{color:css("--label")},defaultDrawNodeLabel:drawLabel,defaultDrawNodeHover:drawHover,zIndex:true,enableEdgeEvents:true,enableEdgeHoverEvents:true,...reducers()});
    let hoverEdge=null;
    renderer.on("enterEdge",({edge,event})=>{ hoverEdge=edge; const [a,b]=graph.extremities(edge); const d=edgeKey(a,b); const w=graph.getEdgeAttribute(edge,"w"), pr=graph.getEdgeAttribute(edge,"p"); showTip(`<b>${byId.get(a).label}</b> ↔ <b>${byId.get(b).label}</b><br><span class="muted">${w} peça(s) em ${pr} processo(s)</span>${d?"<br>"+tipoSummary(d):""}<br><span class="muted">clique para ver onde</span>`,event.original.clientX,event.original.clientY); });
    renderer.on("leaveEdge",()=>{ hoverEdge=null; hideTip(); });
    renderer.on("clickEdge",({edge})=>{ const [a,b]=graph.extremities(edge); hideTip(); selected=null; refresh(); renderEdgePanel(a,b); });
    renderer.on("enterNode",({node,event})=>{ const n=byId.get(node); showTip(`<b>${n.label}</b> <span class="badge" style="--c:var(--${roleOf(n)});font-size:9px">${ROLE_LABEL[roleOf(n)]}</span><br><span class="muted">${n.docs} peças · ${n.procs} processos · ${graph.degree(node)} ligações</span>`,event.original.clientX,event.original.clientY); });
    renderer.on("leaveNode",()=>hideTip());
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
let lastSig="", spreadTimer=null, spreadPending=false, afterSpread=null, autoFocus=false;
function visibleIds(){ return graph.nodes().filter(visible); }
function spread(){ if(live) return; const ids=visibleIds(); if(ids.length<2) return; const sub=new graphology.Graph(); ids.forEach(id=>{const a=graph.getNodeAttributes(id); sub.addNode(id,{x:a.x,y:a.y,size:a.size});});
  const xs=ids.map(id=>graph.getNodeAttribute(id,"x")), ys=ids.map(id=>graph.getNodeAttribute(id,"y")); const ext=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))||1000;
  const margin=Math.max(6,(ext/Math.sqrt(ids.length))*(spacing/100));   // margem relativa ao tamanho do quadro: espaço = % da célula média
  graphologyLibrary.layoutNoverlap.assign(sub,{maxIterations:400,settings:{margin,ratio:1.3,expansion:1.2,gridSize:40}});
  sub.forEachNode((id,a)=>{graph.setNodeAttribute(id,"x",a.x);graph.setNodeAttribute(id,"y",a.y);}); }
function fitVisible(anim=true){ const ids=visibleIds(); if(!ids.length||!renderer) return; const xs=ids.map(id=>graph.getNodeAttribute(id,"x")), ys=ids.map(id=>graph.getNodeAttribute(id,"y")); const mx=Math.min(...xs),Mx=Math.max(...xs),my=Math.min(...ys),My=Math.max(...ys); const px=(Mx-mx||1)*.08, py=(My-my||1)*.08;
  renderer.setCustomBBox({x:[mx-px,Mx+px],y:[my-py,My+py]}); anim?renderer.getCamera().animatedReset({duration:450}):renderer.getCamera().setState({x:.5,y:.5,ratio:1,angle:0}); }
function refresh(){ if(!renderer) return; recompute(); const {nodeReducer,edgeReducer}=reducers(); renderer.setSetting("nodeReducer",nodeReducer); renderer.setSetting("edgeReducer",edgeReducer);
  const ids=visibleIds(); const sig=ids.length+":"+ids.slice(0,40).join(",")+":"+F.sizeBy+F.wMode+F.minL+F.minW+(F.period||""); if(sig!==lastSig){ lastSig=sig; computeDyn(); applySizes(); clearTimeout(spreadTimer); spreadPending=true; spreadTimer=setTimeout(()=>{ spreadPending=false; spread(); renderer.refresh(); if(!selected) fitVisible(); if(afterSpread){ const f=afterSpread; afterSpread=null; f(); } },60); } else if(afterSpread&&!spreadPending){ const f=afterSpread; afterSpread=null; f(); }
  renderer.refresh(); renderLegend(); }
/* centraliza o nó na área que sobra à esquerda da ficha, não atrás dela */
function focus(id,ratio=.22){ if(!renderer||!graph.hasNode(id)) return; const p=renderer.getNodeDisplayData(id); if(!p) return;
  const cw=renderer.getContainer().offsetWidth||1, pn=$("#panel"); const pw=(pn&&!pn.hidden&&innerWidth>860)?pn.offsetWidth:0;
  renderer.getCamera().animate({x:p.x+(pw/2/cw)*ratio,y:p.y,ratio},{duration:600}); }
function select(id){ if(!id&&autoFocus){ autoFocus=false; F.focus=false; $("#focusMode").checked=false; } selected=id; refresh(); renderPanel(id); focusHint(); if(id){ const go=()=>focus(id, F.focus?.3:.22); if(spreadPending) afterSpread=go; else requestAnimationFrame(go); } }
/* busca: recorta o grafo ao nó e às ligações diretas; um aviso permite voltar ao grafo inteiro */
function searchFocus(id){ if(!F.focus){ F.focus=true; F.depth=1; $("#focusMode").checked=true; $("#focusDepth").value="1"; autoFocus=true; } lastSig=""; select(id);
  const enquadra=()=>fitVisible();  // mostra a vizinhança inteira, não um zoom no nó
  if(spreadPending) afterSpread=enquadra; else setTimeout(enquadra,80); }
function focusHint(){ const h=$("#focusHint"); if(!h) return; if(F.focus&&selected){ h.hidden=false; h.innerHTML=`Mostrando só <b>${esc(byId.get(selected).label)}</b> e as ligações diretas. <button class="lnk" id="focusAll">ver o grafo inteiro</button>`; $("#focusAll").onclick=()=>{ autoFocus=false; F.focus=false; $("#focusMode").checked=false; lastSig=""; select(null); setTimeout(()=>fitVisible(),140); }; } else h.hidden=true; }
function ensureVisible(id){ const n=byId.get(id); if(visible(id)) return; if(F.comm!==null&&n.c!==F.comm) F.comm=null; if(F.period&&!hasActiveEdge(id)){ F.period=null; $("#tlFilter").checked=false; } if(topSet&&!topSet.has(id)){ F.topN=0; $("#topN").value="0"; } F.roles.add(roleOf(n)); if(n.docs<F.minDocs){F.minDocs=Math.max(2,n.docs);$("#minDocs").value=F.minDocs;$("#minDocsOut").textContent=F.minDocs;} if(F.proc&&!n.pe.some(([p])=>p===F.proc)){F.proc="";$("#procSel").value="";} syncChips(); }
function openNode(id){ location.hash="grafo"; setTimeout(()=>{ ensureVisible(id); select(id); },60); }
function spark(tl){const ks=Object.keys(tl).sort(); if(ks.length<2) return ""; const vals=ks.map(k=>tl[k]); const mx=Math.max(...vals); const W=320,H=46; const pts=ks.map((k,i)=>`${(i/(ks.length-1))*W},${H-2-(tl[k]/mx)*(H-6)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="${css("--cyan")}" stroke-width="1.5" points="${pts}"/></svg><div class="muted" style="display:flex;justify-content:space-between;font-size:11px"><span>${ks[0]}</span><span>datas citadas junto ao nome</span><span>${ks[ks.length-1]}</span></div>`;}
function renderPanel(id){ const P=$("#panel"); if(!id){P.hidden=true;return;} const n=byId.get(id), e=ENT[id]||{cit:[],tl:{}};
  const neigh=graph.neighbors(id).map(m=>[m,graph.getEdgeAttribute(graph.edge(id,m),"w")]).sort((a,b)=>b[1]-a[1]).slice(0,14);
  const spec=graph.neighbors(id).map(m=>{const a=graph.getEdgeAttributes(graph.edge(id,m)); return [m,a.w,a.l];}).filter(x=>x[1]>=3).sort((a,b)=>sc(b[1],b[2])-sc(a[1],a[2])).slice(0,8);
  const mxp=Math.max(1,...n.pe.map(x=>x[1]));
  P.innerHTML=`<button class="close" aria-label="Fechar">×</button><h3>${n.label}</h3><span class="badge" style="--c:var(--${roleOf(n)})">${ROLE_LABEL[roleOf(n)]}</span>${n.vis?"":' <span class="muted">nome omitido por política</span>'}
  <div class="kv"><div><b>${fmt(n.docs)}</b><span>peças</span></div><div><b>${n.procs}</b><span>processos</span></div><div><b>${fmt(n.mentions)}</b><span>menções</span></div></div>
  <div class="kv m" title="Métricas do grafo completo. Pontes: intermediação (×1000). Influência: PageRank (×1000). Agrupamento: quanto os vizinhos se ligam entre si. Fora do núcleo: parcela das ligações que sai da comunidade."><div><b>${n.bt??0}</b><span>pontes</span></div><div><b>${n.pr??0}</b><span>influência</span></div><div><b>${n.cc??0}</b><span>agrupam.</span></div><div><b>${Math.round((n.br||0)*100)}%</b><span>fora do núcleo</span></div><div><b>${n.jud||0}</b><span>em decisões</span></div></div>
  <div class="period">${n.m0?`Datas citadas junto ao nome: ${n.m0} a ${n.m1}`:""}${n.c>=0?`${n.m0?" · ":""}núcleo <b style="color:${COMM[n.c%COMM.length]}">${esc(commName(n.c))}</b>`:""}</div>
  <div class="acts">${wkBy.has(id)?`<button class="btn small" data-wiki="${id}">Ficha</button>`:""}<button class="btn small" data-mm="${id}">Mapa mental</button><button class="btn small" data-focus="${id}">Só a vizinhança</button><button class="btn ghost small" data-hide="${id}">Ocultar nó</button></div>
  <h4>Presença por processo</h4><div class="bars">${n.pe.slice(0,8).map(([p,c])=>`<div class="bar"><span>${p}</span><i style="width:${(c/mxp)*100}%"></i><span>${c}</span></div>`).join("")}</div>
  <h4>Aparece junto de</h4><div class="neigh">${neigh.map(([m,w])=>`<button data-go="${m}" style="--c:var(--${roleOf(byId.get(m))})"><i></i>${byId.get(m).label}<span class="muted">${w}</span></button>`).join("")}</div>
  <h4 title="Vizinhos com ao menos 3 peças em comum, ordenados por peças em comum × log da especificidade (lift)">Ligações mais específicas</h4><div class="neigh">${spec.map(([m,w,l])=>`<button data-go="${m}" style="--c:var(--${roleOf(byId.get(m))})" title="${w} peças em comum · ${l}× o esperado"><i></i>${byId.get(m).label}<span class="l">${l>=10?Math.round(l):l}×</span></button>`).join("")||"<span class='muted'>nenhuma com 3+ peças em comum</span>"}</div>
  ${tpBars(e.tp)}
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
$("#resetView").onclick=()=>{ pathSet=null; lastSig=""; refresh(); setTimeout(()=>fitVisible(),120); };
$("#zoomIn").onclick=()=>renderer&&renderer.getCamera().animatedZoom({duration:250}); $("#zoomOut").onclick=()=>renderer&&renderer.getCamera().animatedUnzoom({duration:250});
$("#minW").oninput=e=>{F.minW=+e.target.value;$("#minWOut").textContent=F.minW;refresh();};
$("#topN").onchange=e=>{F.topN=+e.target.value;refresh();};
$("#labelsAll").onchange=e=>{F.labelsAll=e.target.checked;refresh();};
$("#collapseLeaves").onchange=e=>{F.collapse=e.target.checked;refresh();};
$("#focusMode").onchange=e=>{F.focus=e.target.checked;autoFocus=false;lastSig="";refresh();focusHint(); if(F.focus&&selected) focus(selected,.3);};
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
attachSearch($("#search"),$("#sugg"),id=>{ ensureVisible(id); if(pathMode) pathClick(id); else searchFocus(id); });
/* caminho */
function setPathMode(on,preA,kind){ pathMode=on; pickKind=kind||"path"; pathA=preA||null; pathSet=null; if(on){ selected=null; renderPanel(null); } const h=$("#pathHint"); h.hidden=!on; const what=pickKind==="common"?"Em comum: ":"Caminho: "; h.textContent=on?what+(pathA?`A = ${byId.get(pathA).label}. Agora clique (ou busque) o nó B.`:"clique (ou busque) o nó A."):""; $("#pathBtn").classList.toggle("primary",on&&pickKind==="path"); $("#commonBtn").classList.toggle("primary",on&&pickKind==="common"); refresh(); }
$("#pathBtn").onclick=()=>setPathMode(!(pathMode&&pickKind==="path"),null,"path");
$("#commonBtn").onclick=()=>setPathMode(!(pathMode&&pickKind==="common"),null,"common");
/* nós vivos: física contínua (ForceAtlas2 em worker) + arrastar */
let live=null, dragging=null, spacing=60;
function fa2Settings(){ const FA=graphologyLibrary.layoutForceAtlas2; const st=FA.inferSettings(graph); return Object.assign(st,{gravity:Math.max(.08,.9-spacing/100),scalingRatio:spacing,barnesHutOptimize:true,linLogMode:true,edgeWeightInfluence:.5,slowDown:3,adjustSizes:true}); }
function startLive(){ if(live) return; const W=graphologyLibrary.FA2Layout||(graphologyLibrary.layoutForceAtlas2&&graphologyLibrary.layoutForceAtlas2.FA2Layout); if(!W){ alert("Layout ao vivo indisponível nesta build."); return; } live=new W(graph,{settings:fa2Settings(),getEdgeWeight:"w"}); live.start(); }
function stopLive(){ if(!live) return; live.kill(); live=null; }
$("#liveLayout").onchange=e=>{ e.target.checked?startLive():stopLive(); };
$("#spacing").oninput=e=>{ spacing=+e.target.value; $("#spacingOut").textContent=spacing; if(live){ stopLive(); startLive(); } else { lastSig=""; refresh(); } };
function bindDrag(){ if(!renderer) return;
  renderer.on("downNode",({node})=>{ dragging=node; graph.setNodeAttribute(node,"highlighted",true); renderer.getCamera().disable(); });
  renderer.getMouseCaptor().on("mousemovebody",e=>{ if(!dragging) return; const pos=renderer.viewportToGraph(e); graph.setNodeAttribute(dragging,"x",pos.x); graph.setNodeAttribute(dragging,"y",pos.y); e.preventSigmaDefault(); e.original.preventDefault(); e.original.stopPropagation(); });
  const up=()=>{ if(!dragging) return; graph.removeNodeAttribute(dragging,"highlighted"); dragging=null; renderer.getCamera().enable(); };
  renderer.getMouseCaptor().on("mouseup",up); renderer.getMouseCaptor().on("mouseleave",up); }
addEventListener("hashchange",()=>{ if(location.hash.slice(1)!=="grafo"&&location.hash.slice(1)!=="tour"&&live){ stopLive(); $("#liveLayout").checked=false; } });
function pathClick(id){ if(!pathA){pathA=id;$("#pathHint").textContent=(pickKind==="common"?"Em comum: ":"Caminho: ")+`A = ${byId.get(id).label}. Agora clique (ou busque) o nó B.`;return;}
  if(pickKind==="common"){ commonClick(id); return; }
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
  $$(".leaf",svg).forEach(g=>{ g.onclick=()=>{const id=g.dataset.id; if(id.startsWith("proc:")) mmProc(id.slice(5)); else mmCenter(id);};
    g.onmousemove=e=>{ const id=g.dataset.id; if(mm.mode==="entidade"&&!id.startsWith("proc:")){ const d=edgeKey(mm.center,id); const e_=graph.edge(mm.center,id); const w=e_?graph.getEdgeAttribute(e_,"w"):0; showTip(`<b>${byId.get(id).label}</b><br><span class="muted">${w} peça(s) em comum com ${byId.get(mm.center).label}</span>${d?"<br>"+tipoSummary(d):""}<br><span class="muted">clique para recentrar</span>`,e.clientX,e.clientY);} else if(mm.mode==="processo"&&!id.startsWith("proc:")){ const n=byId.get(id); const pe=n.pe.find(x=>x[0]===mm.proc); showTip(`<b>${n.label}</b><br><span class="muted">${pe?pe[1]:0} peça(s) em ${mm.proc} · ${n.docs} no total</span>`,e.clientX,e.clientY);} else { const pr=PROCS.find(x=>"proc:"+x.processo===id); if(pr) showTip(`<b>${pr.processo}</b><br><span class="muted">${fmt(pr.pdfs)} peças · ${fmt(pr.pages)} páginas</span>`,e.clientX,e.clientY);} };
    g.onmouseleave=hideTip; });
  loadED();
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
/* a legenda de tipos de peça vive agora na linha do tempo */
const PS={sort:"crono"};
const kind=p=>p.startsWith("INQ")?"inquérito":p.startsWith("RCL")?"reclamação":"petição";
/* ---------- processos: a história de cada um, e o rastro em linguagem natural ---------- */
let RASTRO=null, RESUMOS=null;
async function loadPR(){ if(!RASTRO){ [RASTRO,RESUMOS]=await Promise.all([load("rastro.json"),load("resumos.json")]); } }
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
    linhas.push({d:r[i].d,txt,meta:[pg,sq].filter(Boolean).join(" · "),peso:peso+(mset.has(r[i].d)?2:0)});
    i=j;
  }
  let mes="", out="";
  linhas.forEach((l,k)=>{
    const m=mesDe(l.d); if(m!==mes){ mes=m; out+=`<h5 class="rt-mes">${m}</h5>`; }
    out+=`<div class="rt-l${l.peso>=3?" forte":""}" data-k="${k}"><span class="rt-d">${+l.d.split("-")[2]}</span><span class="rt-t">${l.txt}</span><span class="rt-m">${l.meta}</span></div>`;
  });
  return {html:out,n:linhas.length};
}
function procCard(p){
  const R=RESUMOS[p.processo]||{t:"",o:"",r:[],m:[]};
  const per=periodo(p.processo);
  return `<button class="proc-card" data-p="${esc(p.processo)}"><div class="pc-h"><span class="pid">${p.processo}</span><span class="pc-t">${esc(R.t)}</span></div>
    <p class="pc-o">${esc(R.o)}</p><p class="pc-m">${per} · ${fmt(p.pdfs)} peças · ${fmt(p.pages)} páginas</p></button>`;
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
  const {html,n}=rastroHTML(proc,R.m);
  const marcos=R.m.map(([d,t])=>`<li><b>${dataLonga(d)}</b> — ${esc(t)}</li>`).join("");
  const tops=p.top.slice(0,8).map(([l,rl,c])=>{const id=byLabel.get(l)?.id; return `<button data-open="${id||""}" style="--c:var(--${id?roleOf(byId.get(id)):rl})"><i></i>${esc(l)} <span class="muted">${c}</span></button>`;}).join("");
  const serie=R.s?`<p class="pp-serie">Há uma série de crônicas sobre este processo. <button class="btn small" data-cr="${esc(R.s)}">Ler a série</button></p>`:"";
  const cita=(xg[proc]||[]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([d,c])=>`<button class="lnk" data-goproc="${esc(d)}">${d}</button> <span class="muted">(${c})</span>`).join(", ")||"—";
  P.innerHTML=`<button class="btn ghost small back" id="ppBack">← todos os processos</button>
    <p class="eyebrow">${proc} · ${esc(R.t)}</p><h2>${esc(R.o)}</h2>
    <div class="pp-num"><span>${periodo(proc)}</span><span><b>${fmt(p.pdfs)}</b> peças</span><span><b>${fmt(p.pages)}</b> páginas</span><span><b>${n}</b> movimentos</span></div>
    ${R.r.map(x=>`<p>${esc(x)}</p>`).join("")}
    ${serie}
    <h3>Os momentos que importam</h3><ul class="pp-marcos">${marcos}</ul>
    <h3>O rastro, dia a dia</h3>
    <p class="muted small">Cada linha é uma peça dos autos, descrita pelo que ela é. O <em>seq</em> é o número da peça no processo e o começo do nome do arquivo no pacote público do STF. Peças iguais no mesmo dia aparecem juntas.</p>
    <div class="rt-wrap" id="ppRastro">${html}</div>
    ${n>14?'<button class="btn ghost small" id="ppMais">mostrar o rastro inteiro</button>':""}
    <h3>Quem mais aparece</h3><div class="tops">${tops}</div>
    <p class="muted small" style="margin-top:6px">Contagem de peças narrativas em que o nome aparece. Aparecer muito não diz o que a pessoa fez.</p>
    <h3>Este processo cita</h3><p>${cita}</p>
    <div class="acts"><button class="btn small" data-graph="${esc(proc)}">Ver só este processo no grafo</button><button class="btn small" data-mmp="${esc(proc)}">Mapa mental</button><button class="btn ghost small" data-tl="${esc(proc)}">Linha do tempo</button></div>`;
  L.hidden=true; P.hidden=false; scrollTo({top:0,behavior:"instant"});
  const wrap=$("#ppRastro"); if(n>14) wrap.classList.add("curto");
  const mais=$("#ppMais"); if(mais) mais.onclick=()=>{wrap.classList.remove("curto");mais.remove();};
  $("#ppBack").onclick=()=>{P.hidden=true;L.hidden=false;};
  $$("[data-open]",P).forEach(b=>b.onclick=()=>{ if(b.dataset.open) openNode(b.dataset.open); });
  $$("[data-goproc]",P).forEach(b=>b.onclick=()=>openProc(b.dataset.goproc));
  $$("[data-cr]",P).forEach(b=>b.onclick=()=>{location.hash="cronicas?p="+b.dataset.cr;});
  $$("[data-mmp]",P).forEach(b=>b.onclick=()=>{ mmProc(b.dataset.mmp); location.hash="mapa"; });
  $$("[data-graph]",P).forEach(b=>b.onclick=()=>{ location.hash="grafo"; setTimeout(()=>{F.proc=b.dataset.graph;$("#procSel").value=b.dataset.graph;F.topN=0;$("#topN").value="0";lastSig="";refresh();setTimeout(()=>fitVisible(),200);},60); });
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
    B.innerHTML=`<b>${a} a ${b}</b> · ${fmt(tot)} datas citadas · ${top.map(([p,n])=>`<span style="color:${PCOL[p]}">${p}</span> (${fmt(n)})`).join(", ")} <button class="btn small" id="tlToGraph">ver ligações deste período no grafo</button> <button class="btn ghost small" id="tlClear">limpar</button>`; B.hidden=false;
    $("#tlToGraph").onclick=()=>{ const q0=qOf(a), q1=qOf(b); location.hash="grafo"; setTimeout(async()=>{ $("#tlFilter").checked=true; $("#q0").value=q0; $("#q1").value=q1; if(proc){F.proc=proc;$("#procSel").value=proc;} await syncPeriod(); setTimeout(()=>fitVisible(),250); },80); };
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
window.bmdb={fitVisible,spread,refresh,graph,F,renderRede,drawTL,get renderer(){return renderer;}};
/* ---------- v0.2: métricas dinâmicas, tamanhos, núcleos, período, em comum, exportação, link ---------- */
const sc=(w,l)=>w*Math.log2(Math.max(1,l));
function commName(c){ const xs=G.nodes.filter(n=>n.c===c&&n.vis).sort((a,b)=>b.wdeg-a.wdeg); const short=l=>l.length<=18?l:l.split(" ").slice(0,2).join(" "); return xs.length?xs.slice(0,2).map(n=>short(n.label)).join(" · "):"só pseudonimizados"; }
const tpBars=tp=>{ const xs=Object.entries(tp||{}).sort((a,b)=>b[1]-a[1]).slice(0,6); if(!xs.length) return ""; const mx=xs[0][1]; return `<h4>Tipos de peça</h4><div class="bars">${xs.map(([t,n])=>`<div class="bar"><span title="${esc(tipo(t))}">${esc(tipo(t))}</span><i style="width:${n/mx*100}%"></i><span>${n}</span></div>`).join("")}</div>`; };
function metricsLib(){ const M=graphologyLibrary.metrics&&graphologyLibrary.metrics.centrality; if(!M) return null; return {bt:M.betweenness||M.betweennessCentrality,pr:M.pagerank}; }
function subgraphOf(ids,minW,useOK){ const set=new Set(ids); const sub=new graphology.Graph({type:"undirected"}); ids.forEach(id=>sub.addNode(id)); graph.forEachEdge((e,a,s,d)=>{ if(set.has(s)&&set.has(d)&&(useOK?edgeOK(e,a):a.w>=minW)) sub.addEdge(s,d,{w:a.w,dist:a.dist,l:a.l,p:a.p}); }); return sub; }
function metricOf(id){ const n=byId.get(id); switch(F.sizeBy){ case "deg": return graph.degree(id); case "bt": return dyn.bt?(dyn.bt[id]||0):n.bt; case "pr": return dyn.pr?(dyn.pr[id]||0):n.pr; case "jud": return n.jud||0; default: return n.docs; } }
function computeDyn(){ dyn.bt=null; dyn.pr=null; if(F.sizeBy!=="bt"&&F.sizeBy!=="pr") return; const ids=visibleIds(); if(ids.length<3) return; const L=metricsLib(); if(!L) return; try{ const sub=subgraphOf(ids,F.minW,true); if(F.sizeBy==="bt") dyn.bt=L.bt(sub,{getEdgeWeight:"dist",normalized:true}); else dyn.pr=L.pr(sub,{getEdgeWeight:"w"}); }catch(e){ console.warn("métricas",e); } }
function applySizes(){ if(F.sizeBy==="docs"){ graph.forEachNode((id,a)=>graph.setNodeAttribute(id,"size",2.5+Math.log2(a.n.docs+1)*1.7)); return; } const ids=visibleIds(); let mx=0; const v={}; ids.forEach(id=>{ v[id]=metricOf(id); if(v[id]>mx) mx=v[id]; }); mx=mx||1; graph.forEachNode(id=>graph.setNodeAttribute(id,"size",id in v?3+13*Math.sqrt(v[id]/mx):3)); }
let legendOn=false;
function renderLegend(){ const L=$("#commLegend"); if(!L) return; if(!legendOn){L.hidden=true;return;} const keep=F.comm; F.comm=null; const cnt={}; visibleIds().forEach(id=>{const c=byId.get(id).c; cnt[c]=(cnt[c]||0)+1;}); F.comm=keep; const rows=Object.entries(cnt).map(([c,n])=>[+c,n]).sort((a,b)=>b[1]-a[1]);
  L.innerHTML=`<button class="close" aria-label="Fechar">×</button><h4>Núcleos no recorte · ${rows.length}</h4>`+rows.map(([c,n])=>`<button class="${F.comm===c?"on":""}" data-c="${c}" style="--c:${c>=0?COMM[c%COMM.length]:"var(--pseudo)"}"><i></i><span>${esc(commName(c))}</span><b>${n}</b></button>`).join("")+(F.comm!==null?`<button data-c="all" style="--c:transparent"><span class="muted">mostrar todos os núcleos</span></button>`:"");
  L.hidden=false; $(".close",L).onclick=()=>{legendOn=false;renderLegend();}; $$("[data-c]",L).forEach(b=>b.onclick=()=>{ const c=b.dataset.c; F.comm=(c==="all"||F.comm===+c)?null:+c; lastSig=""; refresh(); setTimeout(()=>fitVisible(),150); }); }
$("#commBtn").onclick=()=>{ legendOn=!legendOn; if(legendOn&&!commColor){ commColor=true; $("#commColor").checked=true; applyColors(); } renderLegend(); };
async function loadETL(){ if(!ETL){ try{ ETL=await load("edges_tl.json"); }catch(e){ ETL={}; } } return ETL; }
(function(){ const qs=[]; for(let y=2015;y<=2026;y++) for(let t=1;t<=4;t++){ qs.push(`${y}T${t}`); } const o=q=>`<option>${q}</option>`; $("#q0").innerHTML=qs.map(o).join(""); $("#q1").innerHTML=qs.map(o).join(""); $("#q0").value="2025T1"; $("#q1").value="2025T4"; })();
async function syncPeriod(){ if($("#tlFilter").checked){ await loadETL(); let a=$("#q0").value,b=$("#q1").value; if(a>b){[a,b]=[b,a]; $("#q0").value=a; $("#q1").value=b;} F.period=[a,b]; } else F.period=null; lastSig=""; refresh(); }
$("#tlFilter").onchange=syncPeriod; $("#q0").onchange=syncPeriod; $("#q1").onchange=syncPeriod;
$("#wMode").onchange=e=>{F.wMode=e.target.value; $("#minLWrap").hidden=F.wMode!=="especifico"; $("#legEdge").textContent=F.wMode==="especifico"?"Espessura = especificidade (lift)":"Espessura = peças em comum"; lastSig=""; refresh();};
$("#minL").oninput=e=>{F.minL=+e.target.value;$("#minLOut").textContent=F.minL;lastSig="";refresh();};
$("#sizeBy").onchange=e=>{F.sizeBy=e.target.value; $("#legSize").textContent="Tamanho = "+({docs:"nº de peças",deg:"nº de ligações",bt:"pontes (no recorte)",pr:"influência (no recorte)",jud:"citações em decisões"})[F.sizeBy]; lastSig=""; refresh();};
$("#edgeColor").onchange=e=>{F.edgeColor=e.target.value; refresh();};
function commonClick(b){ const a=pathA; if(a===b){ $("#pathHint").textContent="Escolha dois nós diferentes."; return; }
  const nb=new Set(graph.neighbors(b).filter(m=>edgeOK(graph.edge(b,m)))); const com=graph.neighbors(a).filter(m=>nb.has(m)&&edgeOK(graph.edge(a,m))&&baseVisible(m));
  const edges=new Set(); com.forEach(m=>{edges.add(graph.edge(a,m));edges.add(graph.edge(b,m));}); if(graph.hasEdge(a,b)) edges.add(graph.edge(a,b));
  pathSet={nodes:new Set([a,b,...com]),edges}; pathA=null; refresh();
  const rows=com.map(m=>[m,graph.getEdgeAttribute(graph.edge(a,m),"w"),graph.getEdgeAttribute(graph.edge(b,m),"w")]).sort((x,y)=>Math.min(y[1],y[2])-Math.min(x[1],x[2]));
  $("#pathHint").innerHTML=`${esc(byId.get(a).label)} ∩ ${esc(byId.get(b).label)}: ${com.length} em comum <button class="btn small" id="pathClear" style="margin-left:8px">limpar</button>`; $("#pathClear").onclick=()=>setPathMode(false);
  const P=$("#panel"); P.innerHTML=`<button class="close" aria-label="Fechar">×</button><h3 style="font-size:17px">${esc(byId.get(a).label)} <span class="muted">∩</span> ${esc(byId.get(b).label)}</h3><p class="muted" style="margin:4px 0 10px">Nomes que dividem página com <b>ambos</b>, respeitando os filtros atuais. Ordenados pela menor das duas ligações. Um nome aqui é um candidato a ponte entre os dois; a leitura das peças decide.</p>
  <table><tr><th>nome</th><th>com A</th><th>com B</th></tr>${rows.map(([m,wa,wb])=>`<tr><td><button class="lnk" data-go="${esc(m)}" style="--c:var(--${roleOf(byId.get(m))})"><i></i>${esc(byId.get(m).label)}</button></td><td>${wa}</td><td>${wb}</td></tr>`).join("")||"<tr><td colspan=3 class='muted'>nenhum vizinho em comum com os filtros atuais</td></tr>"}</table>`;
  P.hidden=false; $(".close",P).onclick=()=>{P.hidden=true;}; $$("[data-go]",P).forEach(x=>x.onclick=()=>{ setPathMode(false); ensureVisible(x.dataset.go); select(x.dataset.go); }); }
/* exportação */
function dl(name,content,type){ const a=document.createElement("a"); a.href=type?URL.createObjectURL(new Blob([content],{type})):content; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
const csvq=v=>`"${String(v??"").replace(/"/g,'""')}"`; const csv=rows=>"﻿"+rows.map(r=>r.map(csvq).join(";")).join("\n");
$("#dlNodes").onclick=()=>{ const rows=[["nome","papel","nucleo","pecas","processos","mencoes","ligacoes_visiveis","pontes_x1000","influencia_x1000","agrupamento","fora_do_nucleo","em_decisoes","primeiro_mes","ultimo_mes"]]; visibleIds().forEach(id=>{const n=byId.get(id); rows.push([n.label,roleOf(n),n.c,n.docs,n.procs,n.mentions,graph.neighbors(id).filter(m=>visible(m)&&edgeOK(graph.edge(id,m))).length,n.bt,n.pr,n.cc,n.br,n.jud,n.m0||"",n.m1||""]);}); dl("autos-abertos_nos.csv",csv(rows),"text/csv;charset=utf-8"); };
$("#dlEdges").onclick=()=>{ const rows=[["a","b","pecas_em_comum","processos","especificidade_lift"]]; graph.forEachEdge((e,a,s,d)=>{ if(visible(s)&&visible(d)&&edgeOK(e,a)) rows.push([byId.get(s).label,byId.get(d).label,a.w,a.p,a.l]); }); dl("autos-abertos_ligacoes.csv",csv(rows),"text/csv;charset=utf-8"); };
$("#dlPng").onclick=()=>{ if(!renderer) return; renderer.refresh(); const cs=renderer.getCanvases(); const first=Object.values(cs)[0]; const W=first.width,H=first.height; const out=document.createElement("canvas"); out.width=W; out.height=H; const ctx=out.getContext("2d"); ctx.fillStyle=css("--bg2"); ctx.fillRect(0,0,W,H); ["edges","edgeLabels","nodes","labels","hovers","hoverNodes"].forEach(k=>{ if(cs[k]) ctx.drawImage(cs[k],0,0); }); const dpr=W/first.clientWidth||1; ctx.fillStyle=css("--muted"); ctx.font=`${12*dpr}px sans-serif`; ctx.fillText("autos-abertos · dados derivados de atos públicos do STF · coocorrência na mesma página não prova relação",12*dpr,H-12*dpr); dl("autos-abertos_grafo.png",out.toDataURL("image/png")); };
/* link permanente da vista */
function stateQS(){ const p=new URLSearchParams(); if(selected) p.set("sel",selected); p.set("r",[...F.roles].join(",")); if(F.proc) p.set("p",F.proc); p.set("d",F.minDocs); p.set("w",F.minW); p.set("t",F.topN); if(F.focus) p.set("f",F.depth); if(F.wMode!=="bruto"){p.set("m",F.wMode);p.set("l",F.minL);} if(F.sizeBy!=="docs") p.set("s",F.sizeBy); if(F.edgeColor!=="discretas") p.set("e",F.edgeColor); if(commColor) p.set("c","1"); if(F.comm!==null) p.set("k",F.comm); if(F.period) p.set("q",F.period.join("-")); if(F.collapse) p.set("cl","1"); return p.toString(); }
async function applyQS(qs){ const p=new URLSearchParams(qs); if(p.get("r")) F.roles=new Set(p.get("r").split(",").filter(Boolean)); F.proc=p.get("p")||""; $("#procSel").value=F.proc; if(p.get("d")){F.minDocs=+p.get("d");$("#minDocs").value=F.minDocs;$("#minDocsOut").textContent=F.minDocs;} if(p.get("w")){F.minW=+p.get("w");$("#minW").value=F.minW;$("#minWOut").textContent=F.minW;} if(p.get("t")!==null){F.topN=+p.get("t");$("#topN").value=String(F.topN);} F.focus=!!p.get("f"); $("#focusMode").checked=F.focus; if(p.get("f")){F.depth=+p.get("f");$("#focusDepth").value=String(F.depth);} F.wMode=p.get("m")||"bruto"; $("#wMode").value=F.wMode; $("#minLWrap").hidden=F.wMode!=="especifico"; if(p.get("l")){F.minL=+p.get("l");$("#minL").value=F.minL;$("#minLOut").textContent=F.minL;} F.sizeBy=p.get("s")||"docs"; $("#sizeBy").value=F.sizeBy; F.edgeColor=p.get("e")||"discretas"; $("#edgeColor").value=F.edgeColor; commColor=!!p.get("c"); $("#commColor").checked=commColor; applyColors(); F.comm=p.get("k")!==null?+p.get("k"):null; legendOn=F.comm!==null||!!p.get("lg"); F.collapse=!!p.get("cl"); $("#collapseLeaves").checked=F.collapse;
  if(p.get("q")){ const [a,b]=p.get("q").split("-"); $("#tlFilter").checked=true; $("#q0").value=a; $("#q1").value=b; await loadETL(); F.period=[a,b]; } else { $("#tlFilter").checked=false; F.period=null; }
  $("#legSize").textContent="Tamanho = "+({docs:"nº de peças",deg:"nº de ligações",bt:"pontes (no recorte)",pr:"influência (no recorte)",jud:"citações em decisões"})[F.sizeBy]; $("#legEdge").textContent=F.wMode==="especifico"?"Espessura = especificidade (lift)":"Espessura = peças em comum";
  syncChips(); lastSig=""; refresh(); const sel=p.get("sel"); if(sel&&byId.has(sel)){ ensureVisible(sel); select(sel); } else setTimeout(()=>fitVisible(),200); }
const PRESETS={geral:"r=pessoa,empresa,autoridade&d=4&w=2&t=120",nucleos:"r=pessoa,empresa,autoridade&d=4&w=2&t=120&c=1&e=nucleo&lg=1",pontes:"r=pessoa,empresa,autoridade&d=3&w=3&t=120&s=bt&m=especifico&l=4&c=1&e=nucleo",empresas:"r=empresa&d=3&w=2&t=0&s=deg",decisoes:"r=pessoa,empresa&d=3&w=2&t=80&s=jud",y2025:"r=pessoa,empresa,autoridade&d=3&w=2&t=120&q=2025T1-2025T4&c=1"};
$$("#presets [data-preset]").forEach(b=>b.onclick=()=>{ $$("#presets .chip").forEach(x=>x.classList.toggle("on",x===b)); drawer(false); setPathMode(false); select(null); applyQS(PRESETS[b.dataset.preset]); });
$("#copyLink").onclick=async()=>{ const url=location.origin+location.pathname+"#grafo?"+stateQS(); try{ await navigator.clipboard.writeText(url); $("#copyLink").textContent="copiado ✓"; }catch(e){ prompt("Copie o link:",url); } setTimeout(()=>$("#copyLink").textContent="copiar link",1500); };

/* ---------- análise de rede ---------- */
const RD={roles:new Set(["pessoa","empresa","autoridade"]),named:true,minW:2,proc:"",year:2023};
$$("#rdChips .chip").forEach(c=>c.onclick=()=>{const r=c.dataset.role; RD.roles.has(r)?RD.roles.delete(r):RD.roles.add(r); c.classList.toggle("on",RD.roles.has(r)); renderRede();});
$("#rdNamed").onchange=e=>{RD.named=e.target.checked;renderRede();}; $("#rdMinW").oninput=e=>{RD.minW=+e.target.value;$("#rdMinWOut").textContent=RD.minW;renderRede();};
META.corpus.processos.forEach(p=>$("#rdProc").insertAdjacentHTML("beforeend",`<option>${p}</option>`)); $("#rdProc").onchange=e=>{RD.proc=e.target.value;renderRede();}; $("#rdYear").onchange=e=>{RD.year=+e.target.value;renderRede();};
const svgEl=(w,h,inner)=>`<svg class="ch" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
const quarters=y0=>{const out=[]; for(let y=y0;y<=2026;y++) for(let t=1;t<=4;t++){const q=`${y}T${t}`; if(q>"2026T3") break; out.push(q);} return out;};
const cut=(s,n)=>s.length>n?s.slice(0,n-1)+"…":s;
function rdPool(){ return G.nodes.filter(n=>RD.roles.has(n.papel)&&(!RD.named||n.vis)&&(!RD.proc||n.pe.some(([p])=>p===RD.proc))); }
function rdMetrics(sub){ const L=metricsLib(); let bt={},pr={}; if(L&&sub.order>2){ try{ bt=L.bt(sub,{getEdgeWeight:"dist",normalized:true}); pr=L.pr(sub,{getEdgeWeight:"w"}); }catch(e){ console.warn("métricas",e); } } return {bt,pr}; }
function renderRede(){ const pool=rdPool(); const sub=subgraphOf(pool.map(n=>n.id),RD.minW,false); const {bt,pr}=rdMetrics(sub); const n=sub.order, m=sub.size; const degs=pool.map(x=>sub.degree(x.id)).sort((a,b)=>a-b); const med=degs.length?degs[Math.floor(degs.length/2)]:0; const dens=n>1?m/(n*(n-1)/2):0;
  const comms={}; pool.forEach(x=>{(comms[x.c]=comms[x.c]||[]).push(x);}); const nComm=Object.values(comms).filter(v=>v.length>=3).length;
  $("#rdTiles").innerHTML=[[fmt(n),"nós no recorte"],[fmt(m),"ligações"],[nComm,"núcleos com 3+ nós"],[(dens*100).toFixed(1)+"%","densidade"],[med,"mediana de ligações"],[fmt(META.grafo.docs_narrativos||0),"peças narrativas"]].map(([b,s])=>`<div class="tile"><b>${b}</b><span>${s}</span></div>`).join("");
  if(!pool.length){ $("#rdBlocks").innerHTML=`<p class="muted">Nenhum nó com esses filtros.</p>`; return; }
  $("#rdBlocks").innerHTML=[blkScatter(pool,bt,pr),blkRank(pool,bt,pr),blkComms(pool,comms),blkPairs(sub),blkJud(pool),blkEmp(),blkWhen(pool),blkProcs(pool)].join(""); bindRede(); }
function bindRede(){ const R=$("#rdBlocks"); $$("[data-open]",R).forEach(b=>b.onclick=()=>openNode(b.dataset.open)); $$("[data-edge]",R).forEach(b=>b.onclick=()=>openEdge(...b.dataset.edge.split("|"))); $$("[data-comm]",R).forEach(b=>b.onclick=()=>openComm(+b.dataset.comm)); R.onmousemove=e=>{const t=e.target.closest("[data-tip]"); if(t) showTip(t.dataset.tip,e.clientX,e.clientY); else hideTip();}; R.onmouseleave=hideTip; }
function openEdge(a,b){ location.hash="grafo"; setTimeout(()=>{ ensureVisible(a); ensureVisible(b); selected=null; refresh(); renderEdgePanel(a,b); focus(a,.3); },80); }
function openComm(c){ location.hash="grafo"; setTimeout(()=>{ F.comm=c; commColor=true; $("#commColor").checked=true; applyColors(); legendOn=true; F.topN=0; $("#topN").value="0"; lastSig=""; refresh(); setTimeout(()=>fitVisible(),250); },80); }
const lnk=(n,extra="")=>`<button class="lnk" data-open="${esc(n.id)}" style="--c:var(--${roleOf(n)})"><i></i>${esc(n.label)}</button>${extra}`;
function blkScatter(pool,bt,pr){ const W=560,H=340,L=46,B=34,T=14,R=14; const mxX=Math.max(2,...pool.map(n=>n.docs)); const mxY=Math.max(1e-6,...pool.map(n=>bt[n.id]||0)); const X=v=>L+Math.log2(v+1)/Math.log2(mxX+1)*(W-L-R); const Y=v=>T+(1-Math.sqrt(v/mxY))*(H-T-B);
  const pts=pool.slice().sort((a,b)=>(bt[b.id]||0)-(bt[a.id]||0)); const lab=new Set(pts.slice(0,10).map(n=>n.id)); const ticks=[1,3,10,30,100,250].filter(v=>v<=mxX);
  return `<div class="rd wide"><h3>Volume × ponte</h3><p class="sub">Horizontal: peças narrativas em que o nome aparece (escala log). Vertical: intermediação no recorte (raiz quadrada). Quem está no alto com pouco volume liga partes do grafo que de outro modo não se tocariam. Tamanho do ponto: influência (PageRank).</p>
  ${svgEl(W,H,`<g stroke="${css("--line")}">${ticks.map(v=>`<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H-B}"/>`).join("")}<line x1="${L}" x2="${W-R}" y1="${H-B}" y2="${H-B}"/></g><g fill="${css("--muted")}" font-size="10">${ticks.map(v=>`<text x="${X(v)}" y="${H-B+14}" text-anchor="middle">${v}</text>`).join("")}<text x="${W-R}" y="${H-B+28}" text-anchor="end">peças (log) →</text><text transform="rotate(-90)" x="${-T}" y="12" text-anchor="end">pontes →</text></g>${pts.slice().reverse().map(n=>{const x=X(n.docs),y=Y(bt[n.id]||0); const r=3+Math.sqrt((pr[n.id]||0)*500); return `<g class="row" data-open="${esc(n.id)}" data-tip="${esc(`<b>${n.label}</b><br><span class=muted>${n.docs} peças · pontes ${((bt[n.id]||0)*1000).toFixed(1)} · influência ${((pr[n.id]||0)*1000).toFixed(1)}</span>`)}"><circle cx="${x}" cy="${y}" r="${r}" fill="${colorOf(n)}" fill-opacity=".75" stroke="${css("--bg2")}"/>${lab.has(n.id)?`<text x="${x>W*.72?x-r-3:x+r+3}" y="${y+3.5}" text-anchor="${x>W*.72?"end":"start"}" font-size="10.5" fill="${css("--ink")}" style="paint-order:stroke;stroke:${css("--bg2")};stroke-width:3">${esc(cut(n.label,26))}</text>`:""}</g>`;}).join("")}`)}</div>`; }
function blkRank(pool,bt,pr){ const li=(xs,f)=>`<ol>${xs.map(n=>`<li>${lnk(n)} <span class="muted">${f(n)}</span></li>`).join("")}</ol>`; const byBt=pool.slice().sort((a,b)=>(bt[b.id]||0)-(bt[a.id]||0)).slice(0,10); const byPr=pool.slice().sort((a,b)=>(pr[b.id]||0)-(pr[a.id]||0)).slice(0,10); const bySpan=pool.slice().sort((a,b)=>b.procs-a.procs||b.docs-a.docs).slice(0,10);
  return `<div class="rd"><h3>Rankings do recorte</h3><p class="sub">Pontes e influência recalculadas só com os nós e ligações filtrados acima; mudam quando você muda o recorte.</p><div class="three"><div><h4>Pontes</h4>${li(byBt,n=>((bt[n.id]||0)*1000).toFixed(1))}</div><div><h4>Influência</h4>${li(byPr,n=>((pr[n.id]||0)*1000).toFixed(1))}</div><div><h4>Em mais processos</h4>${li(bySpan,n=>`${n.procs} proc. · ${n.docs} peças`)}</div></div></div>`; }
function blkComms(pool,comms){ const rows=Object.entries(comms).map(([c,xs])=>[+c,xs]).filter(([c,xs])=>xs.length>=3).sort((a,b)=>b[1].length-a[1].length).slice(0,12); const roles=["pessoa","empresa","autoridade","advogado"];
  return `<div class="rd wide"><h3>Núcleos</h3><p class="sub">Comunidades (Louvain) do grafo completo, vistas pelo recorte. Nome = os dois nós mais ligados do núcleo. "Sai do núcleo" = quem tem a maior parcela de ligações para fora, isto é, a ponte típica.</p><div class="wrap"><table><tr><th>núcleo</th><th class="n">nós</th><th>composição</th><th>processos onde pesa</th><th>sai do núcleo</th><th></th></tr>${rows.map(([c,xs])=>{ const tot=xs.length; const comp=roles.map(r=>[r,xs.filter(x=>x.papel===r).length]).filter(x=>x[1]); const pe={}; xs.forEach(x=>x.pe.forEach(([p,k])=>pe[p]=(pe[p]||0)+k)); const tp=Object.entries(pe).sort((a,b)=>b[1]-a[1]).slice(0,3); const br=xs.slice().sort((a,b)=>(b.br||0)*b.wdeg-(a.br||0)*a.wdeg)[0];
    return `<tr><td><span class="swatch" style="background:${COMM[c%COMM.length]}"></span><b>${esc(commName(c))}</b></td><td class="n">${tot}</td><td><div class="comp" title="${comp.map(([r,k])=>`${ROLE_PL[r]}: ${k}`).join(" · ")}">${comp.map(([r,k])=>`<i style="width:${k/tot*100}%;background:var(--${r})"></i>`).join("")}</div></td><td class="muted">${tp.map(([p,k])=>`${p} (${k})`).join(", ")}</td><td>${br&&br.br?lnk(br,` <span class="muted">${Math.round(br.br*100)}%</span>`):"—"}</td><td><button class="btn ghost small" data-comm="${c}">ver no grafo</button></td></tr>`;}).join("")}</table></div></div>`; }
function blkPairs(sub){ const rows=[]; sub.forEachEdge((e,a,s,d)=>{ if(a.w>=Math.max(3,RD.minW)) rows.push([s,d,a.w,a.p,a.l,sc(a.w,a.l)]); }); rows.sort((x,y)=>y[5]-x[5]); const top=rows.slice(0,20);
  return `<div class="rd"><h3>Pares fortes e específicos</h3><p class="sub">Ordenados por peças em comum × log da especificidade. Um par sobe quando divide muitas páginas <em>e</em> quando essa coincidência é rara em relação ao volume de cada um. Clique para ver as peças em que os dois aparecem.</p><div class="wrap"><table><tr><th>par</th><th class="n">peças</th><th class="n">proc.</th><th class="n" title="lift: observado / esperado">espec.</th></tr>${top.map(([s,d,w,p,l])=>`<tr><td><button class="lnk" data-edge="${esc(s)}|${esc(d)}"><i style="background:${colorOf(byId.get(s))}"></i>${esc(byId.get(s).label)} <span class="muted">↔</span> <i style="background:${colorOf(byId.get(d))}"></i>${esc(byId.get(d).label)}</button></td><td class="n">${w}</td><td class="n">${p}</td><td class="n">${l>=10?Math.round(l):l}×</td></tr>`).join("")||"<tr><td colspan=4 class=muted>nenhum par com esse filtro</td></tr>"}</table></div></div>`; }
function blkWhen(pool){ const qs=quarters(RD.year); const top=pool.slice().sort((a,b)=>b.docs-a.docs).slice(0,30); const rows=top.map(n=>{ const tl=(ENT[n.id]||{}).tl||{}; const q={}; let tot=0; Object.entries(tl).forEach(([m,v])=>{ const k=qOf(m); q[k]=(q[k]||0)+v; tot+=v; }); const mx=Math.max(1,...qs.map(k=>q[k]||0)); return {n,q,tot,mx}; });
  return `<div class="rd wide"><h3>Quem aparece quando</h3><p class="sub">Datas citadas nas páginas em que cada nome aparece, por trimestre, desde ${RD.year}. Cada linha é normalizada pelo próprio pico: compare o formato, não a altura entre linhas. Um trimestre escuro é um período sobre o qual as peças que citam o nome falam muito, não necessariamente quando algo aconteceu.</p><div class="wrap"><table class="hm"><tr><th></th>${qs.map(k=>`<th class="rot">${k}</th>`).join("")}<th>datas</th></tr>${rows.map(({n,q,tot,mx})=>`<tr><th class="lab" data-open="${esc(n.id)}" title="${esc(n.label)}">${esc(cut(n.label,28))}</th>${qs.map(k=>{const v=q[k]||0; const a=v?0.12+0.88*Math.sqrt(v/mx):0; return `<td data-tip="${esc(`<b>${n.label}</b> · ${k}<br><span class=muted>${fmt(v)} datas (${tot?Math.round(v/tot*100):0}% do total do nome)</span>`)}" style="background:color-mix(in srgb,${colorOf(n)} ${Math.round(a*100)}%,var(--bg3))"></td>`;}).join("")}<td class="n muted" style="width:auto;background:transparent">${fmt(tot)}</td></tr>`).join("")}</table></div></div>`; }
function blkProcs(pool){ const ps=META.corpus.processos; const top=pool.slice().sort((a,b)=>b.procs-a.procs||b.docs-a.docs).slice(0,30); const mx=Math.max(1,...top.flatMap(n=>n.pe.map(x=>x[1])));
  return `<div class="rd wide"><h3>Presença por processo</h3><p class="sub">Peças narrativas de cada processo em que o nome aparece. Linhas ordenadas por número de processos: quem atravessa o caso inteiro fica no alto; quem está num único processo costuma ser assunto de um anexo.</p><div class="wrap"><table class="hm"><tr><th></th>${ps.map(p=>`<th class="rot">${p}</th>`).join("")}<th>proc.</th></tr>${top.map(n=>{const pe=Object.fromEntries(n.pe); return `<tr><th class="lab" data-open="${esc(n.id)}" title="${esc(n.label)}">${esc(cut(n.label,28))}</th>${ps.map(p=>{const v=pe[p]||0; const a=v?0.15+0.85*Math.sqrt(v/mx):0; return `<td data-tip="${esc(`<b>${n.label}</b> · ${p}<br><span class=muted>${v} peças narrativas</span>`)}" style="background:color-mix(in srgb,${colorOf(n)} ${Math.round(a*100)}%,var(--bg3))"></td>`;}).join("")}<td class="n muted" style="width:auto;background:transparent">${n.procs}</td></tr>`;}).join("")}</table></div></div>`; }
function blkJud(pool){ const xs=pool.filter(n=>n.papel!=="autoridade"&&(n.jud||0)>0).sort((a,b)=>b.jud-a.jud||b.docs-a.docs).slice(0,18); const head=`<h3>Citados em atos judiciais</h3><p class="sub">Peças em que o nome aparece: à esquerda, decisões, despachos e petições iniciais (atos do juízo ou da acusação); à direita, as demais peças narrativas. Autoridades ficam fora, porque assinam. Ser citado numa decisão não conclui nada; diz que o juízo tratou do nome.</p>`; if(!xs.length) return `<div class="rd">${head}<p class="muted">Ninguém no recorte.</p></div>`; const W=560,rowH=20,L=190,H=xs.length*rowH+30; const mx=Math.max(1,...xs.map(n=>Math.max(n.jud,n.docs-n.jud))); const half=(W-L-10)/2, cx=L+half;
  return `<div class="rd">${head}${svgEl(W,H,`<g font-size="10" fill="${css("--muted")}"><text x="${cx-4}" y="12" text-anchor="end">← em decisões e iniciais</text><text x="${cx+4}" y="12">outras peças →</text></g>${xs.map((n,i)=>{const y=22+i*rowH; const a=n.jud/mx*half, b=(n.docs-n.jud)/mx*half; return `<g class="row" data-open="${esc(n.id)}" data-tip="${esc(`<b>${n.label}</b><br><span class=muted>${n.jud} em decisões/iniciais · ${n.docs-n.jud} noutras peças</span>`)}"><text x="${L-6}" y="${y+13}" font-size="11" text-anchor="end" fill="${css("--ink")}">${esc(cut(n.label,26))}</text><rect x="${cx-a}" y="${y+3}" width="${a}" height="${rowH-7}" rx="3" fill="${css("--pink")}"/><rect x="${cx+1}" y="${y+3}" width="${b}" height="${rowH-7}" rx="3" fill="${css("--cyan")}" fill-opacity=".7"/><text x="${cx-a-4}" y="${y+13}" font-size="10" text-anchor="end" fill="${css("--muted")}">${n.jud}</text></g>`;}).join("")}`)}</div>`; }
function blkEmp(){ const xs=G.nodes.filter(n=>n.papel==="empresa"&&(!RD.proc||n.pe.some(([p])=>p===RD.proc))).sort((a,b)=>b.procs-a.procs||b.docs-a.docs).slice(0,15); const W=560,rowH=20,L=200,H=xs.length*rowH+12; const mx=Math.max(1,...xs.map(n=>n.procs));
  return `<div class="rd"><h3>Empresas recorrentes</h3><p class="sub">Empresas por número de processos em que aparecem em peças narrativas. Recorrência entre processos é sinal de fio condutor; volume dentro de um só processo costuma ser anexo.</p>${svgEl(W,H,xs.map((n,i)=>{const y=6+i*rowH; const w=n.procs/mx*(W-L-120); return `<g class="row" data-open="${esc(n.id)}" data-tip="${esc(`<b>${n.label}</b><br><span class=muted>${n.procs} processos · ${n.docs} peças</span>`)}"><text x="${L-6}" y="${y+13}" font-size="11" text-anchor="end" fill="${css("--ink")}">${esc(cut(n.label,28))}</text><rect x="${L}" y="${y+3}" width="${w}" height="${rowH-7}" rx="3" fill="${css("--empresa")}" fill-opacity=".8"/><text x="${L+w+5}" y="${y+13}" font-size="10" fill="${css("--muted")}">${n.procs} proc. · ${n.docs} peças</text></g>`;}).join(""))}</div>`; }

/* ---------- crônicas (posts em Markdown, índice em posts/index.json) ---------- */
let CR=null; async function loadCR(){ if(!CR){ try{ CR=(await (await fetch("posts/index.json")).json()).posts; }catch(e){ CR=[]; } } return CR; }
const dateBR=d=>{ const [y,m,dd]=d.split("-"); return `${dd} de ${["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][+m-1]} de ${y}`; };
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
        <div class="cr-body">${html}</div>
        <div class="cr-foot"><b>Isto é uma crônica.</b> Texto de opinião, separado da base de dados. O que é fato traz a fonte; o que é leitura é do autor. Coocorrência na mesma página não prova relação, e ninguém aqui é culpado de nada por aparecer num grafo. Erros de fato: abra uma issue no repositório. Todos os avisos: <a href="#avisos" data-nav="avisos">Avisos e direitos</a>.
        <div class="acts"><a class="btn small" href="#grafo" data-nav="grafo">Abrir o grafo</a><a class="btn small" href="#personagens" data-nav="personagens">Personagens</a><button class="btn ghost small" id="crShare">copiar link</button></div>
        <div class="cr-nav">${prev?`<a href="#cronicas?p=${prev.slug}"><span>${inS?"capítulo anterior":"anterior"}</span>${esc(prev.title)}</a>`:"<span></span>"}${next?`<a class="next" href="#cronicas?p=${next.slug}"><span>${inS?"próximo capítulo":"próxima"}</span>${esc(next.title)}</a>`:""}</div></div>`;
      $("#crBack").onclick=()=>{ location.hash="cronicas"; }; $$("[data-nav]",P).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();location.hash=a.dataset.nav;}));
      $("#crShare").onclick=async()=>{ const url=location.origin+location.pathname+`#cronicas?p=${post.slug}`; try{ await navigator.clipboard.writeText(url); $("#crShare").textContent="copiado ✓"; }catch(e){ prompt("Copie o link:",url); } setTimeout(()=>$("#crShare").textContent="copiar link",1500); };
      $$(".cr-body a[href^='#']",P).forEach(a=>a.addEventListener("click",e=>{ e.preventDefault(); location.hash=a.getAttribute("href").slice(1); }));
      document.title=`${post.title} — crônicas do autos-abertos`; window.scrollTo({top:0}); return; } }
  document.title="autos-abertos — crônicas"; P.hidden=true; L.hidden=false;
  const card=x=>`<a class="cr-card" href="#cronicas?p=${x.slug}"><span class="n">${x.serie?`CAPÍTULO ${x.capitulo}`:`CRÔNICA ${String(x.numero).padStart(2,"0")}`} · ${dateBR(x.date)}</span><h3>${esc(x.title)}</h3><p class="sub">${esc(x.subtitle||"")}</p><div class="m"><b>${x.minutes} min</b> · ${(x.tags||[]).join(" · ")}</div></a>`;
  const series=[...new Set(posts.filter(x=>x.serie).map(x=>x.serie))].sort((a,b)=>Math.min(...posts.filter(x=>x.serie===a).map(x=>x.numero))-Math.min(...posts.filter(x=>x.serie===b).map(x=>x.numero))); const solo=posts.filter(x=>!x.serie);
  $("#crCards").innerHTML=series.map(sname=>{const xs=posts.filter(x=>x.serie===sname).sort((a,b)=>a.capitulo-b.capitulo); return `<div class="cr-serie"><h3 class="cr-serie-t">${esc(sname)}</h3><p class="muted">${xs.length} capítulos · ${xs.reduce((s,x)=>s+x.minutes,0)} min no total. Cada capítulo cobre uma parte da decisão, na ordem em que ela mesma se organiza.</p><div class="cr-cards">${xs.map(card).join("")}</div></div>`;}).join("")+(solo.length?`<div class="cr-serie"><h3 class="cr-serie-t">Avulsas</h3><div class="cr-cards">${solo.map(card).join("")}</div></div>`:"")||`<p class="muted">Ainda sem crônicas.</p>`; }
/* ---------- go ---------- */
show(location.hash.slice(1)||"inicio");
})();
