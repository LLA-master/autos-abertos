/* Menus do cabeçalho: as abas do site agrupadas em poucos botões.
   O painel vive em document.body, e não dentro do <nav>, por dois motivos concretos:
   o <nav> rola dentro de si em tela estreita (overflow-x:auto corta qualquer filho absoluto)
   e o <header> tem backdrop-filter, que faz dele o bloco de contenção de filhos fixos. */
(function () {
  const grupos = [].slice.call(document.querySelectorAll(".top .dd"));
  if (!grupos.length) return;
  const painel = g => g._m;
  let aberto = null;

  grupos.forEach(g => {
    g._b = g.querySelector(".dd-b");
    g._m = g.querySelector(".dd-m");
    document.body.appendChild(g._m);           /* tira o painel de dentro do menu que rola */
  });

  function fecha() {
    if (!aberto) return;
    painel(aberto).classList.remove("open");
    aberto._b.setAttribute("aria-expanded", "false");
    aberto = null;
  }

  function posiciona(g) {
    const m = painel(g), r = g._b.getBoundingClientRect();
    m.style.top = Math.round(r.bottom + 6) + "px";
    m.style.left = "0px";                        /* mede a largura antes de encostar na borda */
    const x = Math.max(8, Math.min(Math.round(r.left), innerWidth - m.offsetWidth - 8));
    m.style.left = x + "px";
  }

  function abre(g) {
    fecha();
    painel(g).classList.add("open");
    g._b.setAttribute("aria-expanded", "true");
    aberto = g;
    posiciona(g);
  }

  grupos.forEach(g => {
    g._b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); (aberto === g) ? fecha() : abre(g); });
    g._b.addEventListener("keydown", e => { if (e.key === "ArrowDown") { e.preventDefault(); abre(g); painel(g).querySelector("a").focus(); } });
    painel(g).addEventListener("click", e => { if (e.target.closest("a")) fecha(); });
  });

  addEventListener("click", fecha);
  addEventListener("keydown", e => { if (e.key === "Escape") { const g = aberto; fecha(); if (g) g._b.focus(); } });
  addEventListener("resize", fecha);
  addEventListener("scroll", fecha, true);

  /* o botão do grupo acende quando a aba aberta é uma das suas.
     Nas páginas sem roteador (o dossiê) o destaque vem do HTML e não se mexe aqui. */
  function marca() {
    if (!document.querySelector("[data-nav]")) return;
    const v = (location.hash.slice(1).split("?")[0]) || "inicio";
    grupos.forEach(g => {
      const meu = [].slice.call(painel(g).querySelectorAll("[data-nav]")).some(a => a.dataset.nav === v);
      g._b.classList.toggle("active", meu);
    });
  }
  addEventListener("hashchange", () => { fecha(); marca(); });
  marca();
})();
