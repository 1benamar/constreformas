/* Construcciones y Reformas Costa Brava: comportamiento de la página (sin librerías). */
(function () {
  "use strict";
  var doc = document, html = doc.documentElement;
  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var captura = html.classList.contains("captura");
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var hayIO = "IntersectionObserver" in window;
  var al = function (el, fn, opciones) {
    if (!el) return;
    if (!hayIO || captura) { fn(el, true); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { fn(e.target, e.isIntersecting, e); }); }, opciones || {});
    io.observe(el);
    return io;
  };
  var unaVez = function (els, fn, opciones) {
    els.forEach(function (el) {
      if (!hayIO || captura) { fn(el); return; }
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fn(e.target); io.disconnect(); } }); }, opciones || { rootMargin: "0px 0px -12% 0px" });
      io.observe(el);
    });
  };

  /* ---------- Fotos: fundido al cargar ---------- */
  function marcarCargada(img) { img.classList.add("cargada"); }
  function vigilarFoto(img) {
    if (img.complete && img.naturalWidth) marcarCargada(img);
    else {
      img.addEventListener("load", function () { marcarCargada(img); }, { once: true });
      img.addEventListener("error", function () { marcarCargada(img); }, { once: true });
    }
  }
  $$(".foto img").forEach(vigilarFoto);
  if (captura) $$("img[loading=lazy]").forEach(function (i) { i.loading = "eager"; });

  /* ---------- Cabecera sólida, barra de móvil y titular de portada ---------- */
  var cab = $("[data-cab]"), portada = $("[data-portada]"), barra = $("[data-barra-movil]");
  var fueraPortada = false, enContacto = false;
  function pintarBarra() { if (barra) barra.classList.toggle("visible", fueraPortada && !enContacto); }
  // Sin rootMargin negativo (algunos Chrome lo ignoran): se mira cuánto de la portada queda bajo la cabecera
  var umbrales = []; for (var u = 0; u <= 20; u++) umbrales.push(u / 20);
  al(portada, function (el, dentro, e) {
    var alto = (cab && cab.offsetHeight) || 76;
    var visible = e ? (e.isIntersecting && e.boundingClientRect.bottom > alto + 1) : dentro;
    fueraPortada = !visible;
    cab.classList.toggle("cab--solida", !visible);
    pintarBarra();
  }, { threshold: umbrales });
  al($("#contacto"), function (el, dentro) { enContacto = dentro; pintarBarra(); }, { rootMargin: "-45% 0px -45% 0px" });
  requestAnimationFrame(function () { setTimeout(function () { portada && portada.classList.add("preparada"); }, 60); });

  /* ---------- Menú móvil ---------- */
  var botonMenu = $("[data-menu-abrir]"), menu = $("[data-menu]");
  function cerrarMenu(volverFoco) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    botonMenu.setAttribute("aria-expanded", "false");
    cab.classList.remove("cab--abierta");
    html.style.overflow = "";
    if (volverFoco) botonMenu.focus();
  }
  if (botonMenu && menu) {
    botonMenu.addEventListener("click", function () {
      if (!menu.hidden) return cerrarMenu(false);
      menu.hidden = false;
      botonMenu.setAttribute("aria-expanded", "true");
      cab.classList.add("cab--abierta");
      html.style.overflow = "hidden";
      var primero = $("a", menu); if (primero) primero.focus();
    });
    $$("[data-menu-enlace]").forEach(function (a) { a.addEventListener("click", function () { cerrarMenu(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarMenu(true); });
    window.matchMedia("(min-width: 901px)").addEventListener("change", function (m) { if (m.matches) cerrarMenu(false); });
  }

  /* ---------- Apariciones al entrar en pantalla ---------- */
  unaVez($$(".revela, .foto--revela, [data-pasos], [data-nota], [data-mapa], [data-aparece]"), function (el) { el.classList.add("visible"); });
  unaVez([$("[data-pie]")].filter(Boolean), function (el) { el.classList.add("visible"); }, { rootMargin: "0px 0px -5% 0px" });

  /* ---------- Menú: marca la sección que se está viendo ---------- */
  var enlacesNav = $$(".cab__nav a");
  if (hayIO && enlacesNav.length) {
    var marcar = function (id) { enlacesNav.forEach(function (a) { if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }); };
    var espia = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) marcar(e.target.id); }); }, { rootMargin: "-45% 0px -50% 0px" });
    enlacesNav.forEach(function (a) { var s = doc.getElementById(a.getAttribute("href").slice(1)); if (s) espia.observe(s); });
    al(portada, function (el, dentro) { if (dentro) marcar(""); });
  }

  /* ---------- Horario en directo (hora de Lloret de Mar) ---------- */
  var estados = $$("[data-estado]");
  function horaLloret() {
    try {
      var partes = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var v = {}; partes.forEach(function (p) { v[p.type] = p.value; });
      var dias = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
      return { dia: dias[v.weekday], min: parseInt(v.hour, 10) % 24 * 60 + parseInt(v.minute, 10) };
    } catch (e) { var d = new Date(); return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function pintarEstado() {
    var h = horaLloret(), laborable = h.dia >= 1 && h.dia <= 5, abierto = laborable && h.min >= 540 && h.min < 1080, texto;
    if (abierto) texto = "Abierto ahora · hasta las 18:00";
    else if (laborable && h.min < 540) texto = "Cerrado · abrimos hoy a las 9:00";
    else if (h.dia >= 1 && h.dia <= 4) texto = "Cerrado · abrimos mañana a las 9:00";
    else texto = "Cerrado · abrimos el lunes a las 9:00";
    estados.forEach(function (e) { e.classList.toggle("estado--abierto", abierto); var t = $("[data-estado-texto]", e); if (t) t.textContent = texto; });
  }
  if (estados.length) { pintarEstado(); setInterval(pintarEstado, 60000); }

  /* ---------- Cifras que cuentan ---------- */
  function contar(el) {
    var fin = parseFloat(el.getAttribute("data-contar")), desde = parseFloat(el.getAttribute("data-desde") || "0");
    var dec = parseInt(el.getAttribute("data-decimales") || "0", 10);
    var fmt = function (n) { return n.toFixed(dec).replace(".", ","); };
    if (reducir || captura) { el.textContent = fmt(fin); return; }
    var t0 = null, dur = 1700;
    var paso = function (t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(desde + (fin - desde) * e);
      if (p < 1) requestAnimationFrame(paso);
    };
    el.textContent = fmt(desde);
    requestAnimationFrame(paso);
  }
  unaVez($$("[data-contar]"), contar, { rootMargin: "0px 0px -8% 0px" });

  /* ---------- Portada: pase de obras con la regla ---------- */
  var pases = $$("[data-pase]"), tramos = $$("[data-ir]"), regla = $("[data-regla]"), pausa = $("[data-pases-pausa]"), pie = $("[data-pase-pie]");
  var actual = 0, pausadoPorUsuario = false, pausadoPorSistema = false;
  function cargarPase(n) {
    var f = pases[n]; if (!f) return;
    $$("[data-srcset]", f).forEach(function (s) { s.setAttribute("srcset", s.getAttribute("data-srcset")); s.removeAttribute("data-srcset"); });
    $$("img[data-src]", f).forEach(function (i) { i.src = i.getAttribute("data-src"); i.removeAttribute("data-src"); });
  }
  function pintarPausa() {
    var parado = pausadoPorUsuario || pausadoPorSistema;
    if (regla) regla.classList.toggle("parada", parado);
    if (pausa) {
      pausa.setAttribute("aria-pressed", String(pausadoPorUsuario));
      var t = $("[data-pausa-texto]", pausa); if (t) t.textContent = pausadoPorUsuario ? "Reanudar el pase de fotos" : "Pausar el pase de fotos";
    }
  }
  function mostrarPase(n) {
    if (!pases.length) return;
    n = (n + pases.length) % pases.length;
    cargarPase(n); cargarPase((n + 1) % pases.length);
    pases.forEach(function (f, k) {
      var era = f.classList.contains("pase--activo");
      f.classList.toggle("pase--activo", k === n);
      f.classList.toggle("pase--saliendo", era && k !== n);
      if (k !== n) f.setAttribute("aria-hidden", "true"); else f.removeAttribute("aria-hidden");
    });
    setTimeout(function () { pases.forEach(function (f, k) { if (k !== n) f.classList.remove("pase--saliendo"); }); }, 1500);
    tramos.forEach(function (t, k) {
      t.classList.remove("regla__tramo--activo");
      t.classList.toggle("regla__tramo--hecho", k < n);
      t.setAttribute("aria-current", k === n ? "true" : "false");
    });
    var activo = tramos[n];
    if (activo) { void activo.offsetWidth; activo.classList.add("regla__tramo--activo"); }
    if (pie && activo) pie.textContent = activo.getAttribute("aria-label").replace(/^Foto \d+ de \d+: /, "");
    actual = n;
  }
  if (pases.length) {
    tramos.forEach(function (t) {
      t.addEventListener("click", function () { mostrarPase(parseInt(t.getAttribute("data-ir"), 10)); });
      var relleno = $(".regla__relleno", t);
      if (relleno) relleno.addEventListener("animationend", function () {
        if (t.classList.contains("regla__tramo--activo") && !(pausadoPorUsuario || pausadoPorSistema)) mostrarPase(actual + 1);
      });
    });
    if (pausa) pausa.addEventListener("click", function () { pausadoPorUsuario = !pausadoPorUsuario; pintarPausa(); });
    if (regla) {
      var sobre = function (v) { return function () { pausadoPorUsuario = v; pintarPausa(); }; };
      regla.addEventListener("pointerenter", sobre(true)); regla.addEventListener("pointerleave", sobre(false));
      regla.addEventListener("focusin", sobre(true)); regla.addEventListener("focusout", sobre(false));
    }
    doc.addEventListener("visibilitychange", function () { pausadoPorSistema = doc.hidden; pintarPausa(); });
    al(portada, function (el, dentro) { if (!doc.hidden) { pausadoPorSistema = !dentro; pintarPausa(); } }, { threshold: 0.15 });
    pausadoPorSistema = doc.hidden;
    pintarPausa();
    mostrarPase(0);
  }

  /* ---------- Del plano a la casa: el trazo se dibuja y la obra aparece ---------- */
  var plano = $("[data-plano]"), lienzo = plano && $(".plano__lienzo", plano), rango = plano && $("[data-plano-rango]", plano);
  function corte(v, desdeRango) {
    v = Math.max(0, Math.min(100, v));
    lienzo.style.setProperty("--corte", v + "%");
    rango.style.setProperty("--p", v + "%");
    plano.classList.toggle("con-foto", v > 0.5);
    if (!desdeRango) rango.value = Math.round(v);
    rango.setAttribute("aria-valuetext", v < 1 ? "Plano" : v > 99 ? "Obra terminada" : Math.round(v) + " % de la obra a la vista");
  }
  if (plano && lienzo && rango) {
    rango.addEventListener("input", function () { corte(parseFloat(rango.value), true); });
    unaVez([plano], function () {
      plano.classList.add("dibujado");
      if (reducir || captura) { corte(55); return; }
      setTimeout(function () {
        if (parseFloat(rango.value) > 0) return;
        var t0 = null, dur = 1500;
        var paso = function (t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          corte(55 * e);
          if (p < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      }, 2900);
    }, { threshold: 0.35 });
  }

  /* ---------- Pestañas de interiores (patrón ARIA con flechas) ---------- */
  var pestanas = $$('[role="tab"]');
  function activar(p, foco) {
    pestanas.forEach(function (t) {
      var activa = t === p;
      t.setAttribute("aria-selected", String(activa));
      t.tabIndex = activa ? 0 : -1;
      var panel = doc.getElementById(t.getAttribute("aria-controls"));
      if (panel) { panel.hidden = !activa; panel.classList.toggle("cambiado", activa); }
    });
    if (foco) p.focus();
    p.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducir ? "auto" : "smooth" });
    var panelActivo = doc.getElementById(p.getAttribute("aria-controls"));
    if (panelActivo) $$(".foto img", panelActivo).forEach(vigilarFoto);
  }
  pestanas.forEach(function (p, n) {
    p.addEventListener("click", function () { if (p.getAttribute("aria-selected") !== "true") activar(p, false); });
    p.addEventListener("keydown", function (e) {
      var k = e.key, i = n;
      if (k === "ArrowRight") i = (n + 1) % pestanas.length;
      else if (k === "ArrowLeft") i = (n - 1 + pestanas.length) % pestanas.length;
      else if (k === "Home") i = 0;
      else if (k === "End") i = pestanas.length - 1;
      else return;
      e.preventDefault();
      activar(pestanas[i], true);
    });
  });
  var barraPestanas = $(".pestanas");
  if (barraPestanas) {
    var mirarBarra = function () { barraPestanas.classList.toggle("al-final", barraPestanas.scrollLeft + barraPestanas.clientWidth >= barraPestanas.scrollWidth - 4); };
    barraPestanas.addEventListener("scroll", mirarBarra, { passive: true }); window.addEventListener("resize", mirarBarra); mirarBarra();
  }

  /* ---------- Tira de exteriores: flechas y arrastre con ratón ---------- */
  var pista = $("[data-tira-pista]"), ant = $("[data-tira-ant]"), sig = $("[data-tira-sig]");
  if (pista) {
    var items = $$(".tira__item", pista);
    var paso = function (dir) {
      var ancho = items[0] ? items[0].getBoundingClientRect().width : pista.clientWidth * 0.6;
      pista.scrollBy({ left: dir * Math.max(ancho, pista.clientWidth * 0.6), behavior: reducir ? "auto" : "smooth" });
    };
    if (ant) ant.addEventListener("click", function () { paso(-1); });
    if (sig) sig.addEventListener("click", function () { paso(1); });
    if (hayIO && items.length && ant && sig) {
      var vistos = new Map();
      var vigia = new IntersectionObserver(function (es) {
        es.forEach(function (en) { vistos.set(en.target, en.intersectionRatio > 0.95); });
        ant.disabled = !!vistos.get(items[0]);
        sig.disabled = !!vistos.get(items[items.length - 1]);
      }, { root: pista, threshold: [0, 0.95, 1] });
      vigia.observe(items[0]); vigia.observe(items[items.length - 1]);
    }
    var x0 = 0, s0 = 0, movido = false, abajo = false;
    pista.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse" || e.button !== 0) return; abajo = true; movido = false; x0 = e.clientX; s0 = pista.scrollLeft; });
    window.addEventListener("pointermove", function (e) {
      if (!abajo) return;
      var dx = e.clientX - x0;
      if (!movido && Math.abs(dx) > 6) { movido = true; pista.classList.add("arrastrando"); }
      if (movido) pista.scrollLeft = s0 - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!abajo) return; abajo = false;
      if (movido) { setTimeout(function () { pista.classList.remove("arrastrando"); }, 0); }
    });
    pista.addEventListener("click", function (e) { if (movido) { e.preventDefault(); e.stopPropagation(); movido = false; } }, true);
  }

  /* ---------- Visor de fotos con enlace propio (#fotos/cat/n) y atrás que lo cierra ---------- */
  var G = window.GALERIAS || {};
  var dlg = $("[data-visor-dialogo]");
  var vImg = $("[data-visor-img]"), vPie = $("[data-visor-pie]"), vCuenta = $("[data-visor-cuenta]"), vTitulo = $("[data-visor-titulo]");
  var estado = { cat: null, i: 0, origen: null, empujado: false };
  var avif = true;
  (function () { var p = new Image(); p.onload = function () { avif = p.width > 0; }; p.onerror = function () { avif = false; }; p.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A="; })();
  function srcsetDe(f, ext) { return f.a.map(function (w) { return "assets/img/" + f.id + "-" + w + "." + ext + " " + w + "w"; }).join(", "); }
  function pintarVisor() {
    var g = G[estado.cat]; if (!g) return;
    var f = g.fotos[estado.i];
    vImg.classList.add("cambiando");
    var nueva = new Image();
    nueva.sizes = "(min-width: 900px) 80vw, 100vw";
    nueva.srcset = srcsetDe(f, avif ? "avif" : "webp");
    nueva.src = "assets/img/" + f.id + "-" + f.a[f.a.length - 1] + ".webp";
    var poner = function () {
      vImg.sizes = nueva.sizes; vImg.srcset = nueva.srcset; vImg.src = nueva.src;
      vImg.width = f.w; vImg.height = f.h; vImg.alt = f.alt;
      vImg.classList.remove("cambiando");
    };
    if (nueva.decode) nueva.decode().then(poner, poner); else nueva.onload = poner;
    vPie.textContent = f.alt;
    vTitulo.textContent = g.nombre;
    vCuenta.textContent = (estado.i + 1) + " de " + g.fotos.length;
    var s = g.fotos[(estado.i + 1) % g.fotos.length];
    var pre = new Image(); pre.sizes = nueva.sizes; pre.srcset = srcsetDe(s, avif ? "avif" : "webp");
  }
  function hashDe() { return "#fotos/" + estado.cat + "/" + (estado.i + 1); }
  function abrirVisor(cat, i, origen, desdeHash) {
    if (!G[cat] || !dlg) return;
    estado.cat = cat; estado.i = Math.max(0, Math.min(i, G[cat].fotos.length - 1)); estado.origen = origen || null;
    pintarVisor();
    if (!dlg.open) { dlg.showModal(); html.classList.add("visor-abierto"); }
    if (!desdeHash) { history.pushState({ visor: true }, "", hashDe()); estado.empujado = true; } else estado.empujado = false;
  }
  function moverVisor(d) {
    var n = G[estado.cat].fotos.length;
    estado.i = (estado.i + d + n) % n;
    pintarVisor();
    history.replaceState(history.state, "", hashDe());
  }
  function cerrarVisor(porHistoria) {
    if (!dlg || !dlg.open) return;
    dlg.close();
    html.classList.remove("visor-abierto");
    if (!porHistoria) {
      if (estado.empujado) history.back();
      else history.replaceState(null, "", location.pathname + location.search);
    }
    estado.empujado = false;
    if (estado.origen && estado.origen.focus) estado.origen.focus();
  }
  if (dlg) {
    $$("[data-visor]").forEach(function (b) {
      b.addEventListener("click", function () { abrirVisor(b.getAttribute("data-visor"), parseInt(b.getAttribute("data-i"), 10) || 0, b, false); });
    });
    $("[data-visor-ant]").addEventListener("click", function () { moverVisor(-1); });
    $("[data-visor-sig]").addEventListener("click", function () { moverVisor(1); });
    $("[data-visor-cerrar]").addEventListener("click", function () { cerrarVisor(false); });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); cerrarVisor(false); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); moverVisor(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); moverVisor(-1); }
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.classList.contains("visor__marco")) cerrarVisor(false); });
    var tx = null, ty = null;
    dlg.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) moverVisor(dx < 0 ? 1 : -1);
      tx = ty = null;
    }, { passive: true });
    window.addEventListener("popstate", function () {
      var m = /^#fotos\/(\w+)\/(\d+)$/.exec(location.hash);
      if (m && G[m[1]]) abrirVisor(m[1], parseInt(m[2], 10) - 1, null, true);
      else cerrarVisor(true);
    });
    var m0 = /^#fotos\/(\w+)\/(\d+)$/.exec(location.hash);
    if (m0 && G[m0[1]]) abrirVisor(m0[1], parseInt(m0[2], 10) - 1, null, true);
  }

  /* ---------- Muestrario de acabados ---------- */
  var muestras = $$("[data-muestra]"), vista = $("[data-muestra-vista]");
  var muestraActual = muestras[0];
  if (vista && muestras.length) {
    var marco = $(".muestrario__marco", vista), nombre = $("[data-muestra-nombre]", vista), donde = $("[data-muestra-donde]", vista);
    var elegir = function (b) {
      if (b === muestraActual) return;
      muestraActual = b;
      muestras.forEach(function (m) { m.setAttribute("aria-pressed", String(m === b)); });
      var g = G[b.getAttribute("data-cat")], f = g && g.fotos[parseInt(b.getAttribute("data-i"), 10)];
      if (!f) return;
      var pic = doc.createElement("picture");
      pic.className = reducir ? "" : "entrando";
      pic.innerHTML = '<source type="image/avif" srcset="' + srcsetDe(f, "avif") + '" sizes="(min-width: 900px) 48vw, 100vw"><img src="assets/img/' + f.id + "-" + f.a[Math.min(1, f.a.length - 1)] + '.webp" srcset="' + srcsetDe(f, "webp") + '" sizes="(min-width: 900px) 48vw, 100vw" alt="' + f.alt.replace(/"/g, "&quot;") + '" width="' + f.w + '" height="' + f.h + '">';
      marco.appendChild(pic);
      var viejas = $$("picture", marco).slice(0, -1);
      setTimeout(function () { viejas.forEach(function (v) { v.remove(); }); }, reducir ? 0 : 520);
      nombre.textContent = b.getAttribute("data-nombre");
      donde.textContent = b.getAttribute("data-donde");
    };
    muestras.forEach(function (b) {
      b.addEventListener("click", function () { elegir(b); });
      b.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") elegir(b); });
    });
    var abrirMuestra = $("[data-muestra-abrir]");
    if (abrirMuestra) abrirMuestra.addEventListener("click", function () { abrirVisor(muestraActual.getAttribute("data-cat"), parseInt(muestraActual.getAttribute("data-i"), 10), abrirMuestra, false); });
  }

  /* ---------- Carrusel de opiniones ---------- */
  var carrusel = $("[data-carrusel]");
  if (carrusel) {
    var citas = $$("[data-cita]", carrusel), puntos = $$("[data-cita-ir]", carrusel), pausaCitas = $("[data-cita-pausa]", carrusel);
    var cActual = 0, cUsuario = reducir, cSistema = true;
    var pintarCPausa = function () {
      carrusel.classList.toggle("parado", cUsuario || cSistema);
      pausaCitas.setAttribute("aria-pressed", String(cUsuario));
      $("[data-cita-pausa-texto]", pausaCitas).textContent = cUsuario ? "Reanudar las opiniones" : "Pausar las opiniones";
    };
    var irCita = function (n) {
      n = (n + citas.length) % citas.length;
      citas.forEach(function (c, k) { c.hidden = k !== n; c.classList.toggle("cita--activa", k === n); });
      puntos.forEach(function (p, k) {
        p.classList.remove("carrusel__punto--activo");
        p.classList.toggle("carrusel__punto--hecho", k < n);
        p.setAttribute("aria-current", k === n ? "true" : "false");
      });
      void puntos[n].offsetWidth; puntos[n].classList.add("carrusel__punto--activo");
      cActual = n;
    };
    puntos.forEach(function (p, k) {
      p.addEventListener("click", function () { irCita(k); });
      $("span", p).addEventListener("animationend", function () { if (p.classList.contains("carrusel__punto--activo") && !(cUsuario || cSistema)) irCita(cActual + 1); });
    });
    $("[data-cita-ant]", carrusel).addEventListener("click", function () { irCita(cActual - 1); });
    $("[data-cita-sig]", carrusel).addEventListener("click", function () { irCita(cActual + 1); });
    pausaCitas.addEventListener("click", function () { cUsuario = !cUsuario; pintarCPausa(); });
    carrusel.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { cSistema = true; pintarCPausa(); } });
    carrusel.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { cSistema = false; pintarCPausa(); } });
    carrusel.addEventListener("focusin", function () { cSistema = true; pintarCPausa(); });
    carrusel.addEventListener("focusout", function () { cSistema = false; pintarCPausa(); });
    al(carrusel, function (el, dentro) { cSistema = !dentro || doc.hidden; pintarCPausa(); }, { threshold: 0.4 });
    irCita(0); pintarCPausa();
  }

  /* ---------- Formulario: prepara el correo (no envía datos a ningún servidor) ---------- */
  var form = $("[data-formulario]");
  if (form) {
    var destino = "constreformascb@gmail.com";
    var caja = $("[data-estado-form]", form), copiar = $("[data-copiar]", form);
    var ultimo = "";
    var error = function (id, mostrar, campos) {
      var p = doc.getElementById(id); if (p) p.hidden = !mostrar;
      (campos || []).forEach(function (c) { if (mostrar) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid"); });
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = form.nombre, telefono = form.telefono, correo = form.correo, mensaje = form.mensaje;
      var tipo = (form.querySelector('input[name="tipo"]:checked') || {}).value || "";
      var okNombre = nombre.value.trim().length > 1;
      var okCorreo = !correo.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim());
      var okContacto = (telefono.value.replace(/\D/g, "").length >= 9 || correo.value.trim()) && okCorreo;
      var okMensaje = mensaje.value.trim().length > 4;
      error("e-nombre", !okNombre, [nombre]);
      error("e-contacto", !okContacto, [telefono, correo]);
      error("e-mensaje", !okMensaje, [mensaje]);
      if (!okNombre) return nombre.focus();
      if (!okContacto) return (telefono.value ? correo : telefono).focus();
      if (!okMensaje) return mensaje.focus();
      var lineas = ["Hola, me gustaría pedir presupuesto.", "", "Nombre: " + nombre.value.trim()];
      if (telefono.value.trim()) lineas.push("Teléfono: " + telefono.value.trim());
      if (correo.value.trim()) lineas.push("Correo: " + correo.value.trim());
      lineas.push("Tipo de obra: " + tipo);
      if (form.lugar.value.trim()) lineas.push("Municipio: " + form.lugar.value.trim());
      lineas.push("", mensaje.value.trim());
      ultimo = lineas.join("\n");
      window.location.href = "mailto:" + destino + "?subject=" + encodeURIComponent("Presupuesto: " + tipo) + "&body=" + encodeURIComponent(ultimo);
      caja.hidden = false;
    });
    if (copiar) copiar.addEventListener("click", function () {
      var span = $("span", copiar);
      var hecho = function () { span.textContent = "Mensaje copiado"; setTimeout(function () { span.textContent = "Copiar el mensaje"; }, 2400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ultimo).then(hecho, function () {});
    });
  }
})();
