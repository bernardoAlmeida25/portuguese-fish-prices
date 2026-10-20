"use strict";

/* Preços do pescado — lê data/manifest.json e data/months/AAAA-MM.json (gerados por build_json.py). */

const DATA = "data/";
const FRESH = { 1: "E", 2: "A", 3: "B" }; // campo f dos dados (coincide com a letra do nome em 100% dos registos)
const GREEN = "#2b8068", ORANGE = "#d9822b", GREY = "#9fb3ab";
const LINE_COLORS = ["#2b8068", "#2f6fb0", "#d9822b", "#8a5db8", "#c0494a", "#6b7f78"];

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
const pct = (x, d = 0) => (x > 0 ? "+" : "") +
  (x * 100).toLocaleString("pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
const plain = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = a => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const groupBy = (arr, keyFn) => {
  const map = new Map();
  arr.forEach(x => { const k = keyFn(x); (map.get(k) || map.set(k, []).get(k)).push(x); });
  return map;
};
const shortDate = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const longDate = iso => new Date(iso + "T12:00:00")
  .toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

let manifest, lotaNames, itemInfo, speciesList;
const monthCache = new Map();
const charts = {};
let currentPage = 1, pageSize = 10, renderToken = 0;

/* ---------------------------------------------------------------- dados */

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** Devolve Map(dia -> linhas [dia, lota, produto, preço]) do mês; guarda em cache. */
function loadMonth(ym) {
  if (!monthCache.has(ym)) {
    const promise = getJSON(`${DATA}months/${ym}.json`).then(m => {
      const byDay = new Map(m.days.map(d => [d, []]));
      m.rows.forEach(r => byDay.get(m.days[r[0]]).push(r));
      return byDay;
    }).catch(err => { monthCache.delete(ym); throw err; });
    monthCache.set(ym, promise);
  }
  return monthCache.get(ym);
}

function rowObj(r) {
  const it = itemInfo[r[2]];
  return { l: r[1], i: r[2], p: r[3], lota: lotaNames[r[1]], esp: it.esp, t: it.t, f: it.f,
           especie: it.especie, label: it.label, hay: it.hay + " " + plain(lotaNames[r[1]]) };
}

function showError(message) {
  const el = $("load-error");
  el.textContent = message;
  el.hidden = false;
}

/* ------------------------------------------------------------- utilitários UI */

function fillSelect(id, options, firstLabel) {
  const el = $(id), previous = el.value;
  el.innerHTML = "";
  if (firstLabel !== null) {
    const first = document.createElement("option");
    first.value = ""; first.textContent = firstLabel;
    el.append(first);
  }
  options.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value; option.textContent = label;
    el.append(option);
  });
  if ([...el.options].some(o => o.value === previous)) el.value = previous;
}

function makeChart(name, canvasId, config) {
  if (charts[name]) charts[name].destroy();
  charts[name] = new Chart($(canvasId), config);
}

/** Mostra uma mensagem em vez do gráfico (ou volta a mostrar o gráfico se msg for null). */
function chartMessage(name, canvasId, msgId, msg) {
  const wrap = $(canvasId).parentElement, el = $(msgId);
  if (msg) {
    if (charts[name]) { charts[name].destroy(); delete charts[name]; }
    wrap.hidden = true; el.textContent = msg; el.hidden = false;
  } else {
    wrap.hidden = false; el.hidden = true;
  }
}

const percentAxis = { ticks: { callback: v => pct(v) }, grid: { display: true } };

/* ------------------------------------------------------------------ gráficos */

function drawTop(rows) {
  const list = [...groupBy(rows, r => r.i)].map(([i, rs]) => {
    const prices = rs.map(r => r.p);
    return { label: itemInfo[i].label, med: median(prices), min: Math.min(...prices), max: Math.max(...prices),
             n: new Set(rs.map(r => r.l)).size };
  }).sort((a, b) => b.med - a.med).slice(0, 10);

  if (!list.length) return chartMessage("top", "topChart", "topMsg", "Sem registos para os filtros escolhidos.");
  chartMessage("top", "topChart", "topMsg", null);
  makeChart("top", "topChart", {
    type: "bar",
    data: { labels: list.map(x => x.label),
            datasets: [{ data: list.map(x => +x.med.toFixed(2)), backgroundColor: GREEN, borderRadius: 5, maxBarThickness: 24 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => {
        const x = list[c.dataIndex];
        return " " + money(x.med) + (x.n > 1 ? ` · ${x.n} lotas (${money(x.min)} a ${money(x.max)})` : "");
      } } } },
      scales: { x: { beginAtZero: true, ticks: { callback: v => money(v) } },
                y: { grid: { display: false }, ticks: { autoSkip: false } } }
    }
  });
}

function drawLotas(base, selectedLota) {
  const diffs = new Map();
  groupBy(base, r => r.i).forEach(rs => {
    if (rs.length < 2) return;
    const ref = median(rs.map(r => r.p));
    if (!(ref > 0.2)) return; // preços de cêntimos geram percentagens sem significado
    rs.forEach(r => (diffs.get(r.l) || diffs.set(r.l, []).get(r.l)).push(r.p / ref - 1));
  });
  const list = [...diffs].filter(([, d]) => d.length >= 5)
    .map(([l, d]) => ({ l, name: lotaNames[l], v: median(d), n: d.length }))
    .sort((a, b) => a.v - b.v);

  if (list.length < 2) {
    return chartMessage("lota", "lotaChart", "lotaMsg",
      "Para comparar lotas são precisos pelo menos 2 lotas com 5 ou mais produtos em comum neste dia.");
  }
  chartMessage("lota", "lotaChart", "lotaMsg", null);
  makeChart("lota", "lotaChart", {
    type: "bar",
    data: { labels: list.map(x => x.name),
            datasets: [{ data: list.map(x => x.v),
                         backgroundColor: list.map(x => (x.v <= 0 ? GREEN : ORANGE)),
                         borderColor: list.map(x => (String(x.l) === selectedLota ? "#18312b" : "transparent")),
                         borderWidth: 2, borderRadius: 4, maxBarThickness: 22 }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => {
        const x = list[c.dataIndex];
        return ` ${pct(x.v, 1)} face à mediana · ${x.n} produtos comparados`;
      } } } },
      scales: { x: { ...percentAxis, title: { display: true, text: "← mais barata · mais cara →" } },
                y: { grid: { display: false }, ticks: { autoSkip: false } } }
    }
  });
}

function drawFreshness(rows) {
  const e = [], b = [];
  groupBy(rows, r => `${r.l}|${r.esp}|${r.t}`).forEach(rs => {
    const byF = new Map(rs.map(r => [r.f, r.p])), a = byF.get(2);
    if (!(a > 0)) return;
    if (byF.has(1)) e.push(byF.get(1) / a - 1);
    if (byF.has(3)) b.push(byF.get(3) / a - 1);
  });
  const MIN = 3;
  if (e.length < MIN && b.length < MIN) {
    return chartMessage("fresh", "freshChart", "freshMsg",
      "Há poucos produtos com várias frescuras na mesma lota para comparar (mínimo: 3 pares).");
  }
  chartMessage("fresh", "freshChart", "freshMsg", null);
  const values = [e.length >= MIN ? median(e) : null, 0, b.length >= MIN ? median(b) : null];
  const counts = [e.length, null, b.length];
  makeChart("fresh", "freshChart", {
    type: "bar",
    data: { labels: ["Extra (E)", "A (referência)", "B"],
            datasets: [{ data: values, backgroundColor: [GREEN, GREY, ORANGE], borderRadius: 5, maxBarThickness: 60 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c =>
        c.dataIndex === 1 ? " Referência" : ` ${pct(c.raw, 1)} face ao A · ${counts[c.dataIndex]} pares` } } },
      scales: { y: percentAxis, x: { grid: { display: false } } }
    }
  });
}

function drawSizes(rows) {
  const ratios = { 2: [], 3: [], 4: [], 5: [], 6: [] };
  groupBy(rows.filter(r => r.t > 0), r => `${r.l}|${r.esp}|${r.f}`).forEach(rs => {
    const byT = new Map(rs.map(r => [r.t, r.p])), base = byT.get(1);
    if (!(base > 0)) return;
    Object.keys(ratios).forEach(t => { if (byT.has(+t)) ratios[t].push(byT.get(+t) / base - 1); });
  });
  const MIN = 3, ts = Object.keys(ratios).filter(t => ratios[t].length >= MIN);
  if (!ts.length) {
    return chartMessage("size", "sizeChart", "sizeMsg",
      "Há poucos produtos com vários calibres na mesma lota para comparar (mínimo: 3 pares por calibre).");
  }
  chartMessage("size", "sizeChart", "sizeMsg", null);
  makeChart("size", "sizeChart", {
    type: "bar",
    data: { labels: ["T1 (ref.)", ...ts.map(t => "T" + t)],
            datasets: [{ data: [0, ...ts.map(t => median(ratios[t]))], backgroundColor: [GREY, ...ts.map(() => GREEN)],
                         borderRadius: 5, maxBarThickness: 48 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c =>
        c.dataIndex === 0 ? " Referência" : ` ${pct(c.raw, 1)} face ao T1 · ${ratios[ts[c.dataIndex - 1]].length} pares` } } },
      scales: { y: percentAxis, x: { grid: { display: false } } }
    }
  });
}

async function drawTrend(esp, lota, token) {
  const note = $("trendNote"), wrap = $("trendWrap");
  const hide = text => { wrap.hidden = true; note.textContent = text; if (charts.trend) { charts.trend.destroy(); delete charts.trend; } };
  if (!esp) return hide("Escolhe uma espécie nos filtros para ver como mudaram os preços dos seus produtos nos últimos 90 dias.");

  let maps;
  try { maps = await Promise.all(manifest.months.slice(-3).map(loadMonth)); }
  catch (err) { return hide("Não foi possível carregar o histórico (" + err.message + ")."); }
  if (token !== renderToken) return;

  const latest = manifest.days[manifest.days.length - 1].d;
  const limit = new Date(longIso(latest).getTime() - 90 * 86400000);
  const perItem = new Map(); // produto -> Map(dia -> [preços])
  const allDays = new Set();
  maps.forEach(byDay => byDay.forEach((rs, day) => {
    if (longIso(day) < limit) return;
    rs.forEach(r => {
      if (itemInfo[r[2]].esp !== esp || (lota !== "" && String(r[1]) !== lota)) return;
      allDays.add(day);
      const days = perItem.get(r[2]) || perItem.set(r[2], new Map()).get(r[2]);
      (days.get(day) || days.set(day, []).get(day)).push(r[3]);
    });
  }));
  const days = [...allDays].sort();
  const series = [...perItem].filter(([, d]) => d.size >= 2)
    .sort((a, b) => b[1].size - a[1].size || median([...b[1].values()].flat()) - median([...a[1].values()].flat()))
    .slice(0, 6);
  const name = manifest.species[esp] || esp;

  if (days.length < 2 || !series.length) {
    return hide(`Ainda não há dias suficientes para mostrar a evolução de ${name}: são precisos pelo menos 2 dias com o mesmo produto` +
                (lota !== "" ? " nesta lota." : "."));
  }
  wrap.hidden = false;
  note.textContent = `Preço dos produtos de ${name} nos últimos 90 dias com dados` +
    (lota !== "" ? ` na lota ${lotaNames[+lota]}.` : ": mediana entre as lotas com dados em cada dia. Se o número de lotas variar, escolhe uma lota para evitar saltos.");
  makeChart("trend", "trendChart", {
    type: "line",
    data: { labels: days.map(shortDate),
            datasets: series.map(([i, byDay], k) => ({
              label: itemInfo[i].label, data: days.map(d => (byDay.has(d) ? median(byDay.get(d)) : null)),
              borderColor: LINE_COLORS[k], backgroundColor: LINE_COLORS[k], borderWidth: 2, pointRadius: 3, tension: .2, spanGaps: true })) },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw == null ? "sem registo" : money(c.raw)}` } } },
      scales: { y: { beginAtZero: false, ticks: { callback: v => money(v) } }, x: { grid: { display: false } } }
    }
  });
}

const longIso = iso => new Date(iso + "T12:00:00");

/* ------------------------------------------------------------ separador 1 */

async function renderMain() {
  const token = ++renderToken;
  const day = $("day").value;
  if (!day) return;
  let byDay;
  try { byDay = await loadMonth(day.slice(0, 7)); }
  catch (err) { return showError("Não foi possível carregar os dados de " + day + " (" + err.message + ")."); }
  if (token !== renderToken) return;

  const lota = $("market").value, esp = $("species").value, q = plain($("search").value.trim());
  const dayRows = (byDay.get(day) || []).map(rowObj);
  const base = dayRows.filter(r => (!esp || r.esp === esp) && (!q || r.hay.includes(q))); // sem filtro de lota
  const rows = lota !== "" ? base.filter(r => String(r.l) === lota) : base;

  const info = manifest.days.find(d => d.d === day);
  $("coverage").textContent = info && info.lotas < manifest.lotas.length
    ? `Neste dia só há dados de ${info.lotas} das ${manifest.lotas.length} lotas; as comparações entre lotas usam apenas essas.` : "";

  // Resumo
  const top = rows.reduce((best, r) => (!best || r.p > best.p ? r : best), null);
  $("avg").textContent = rows.length ? money(median(rows.map(r => r.p))) : "—";
  $("count").textContent = rows.length.toLocaleString("pt-PT");
  $("countDetail").textContent = `${new Set(rows.map(r => r.esp)).size} espécies · ${new Set(rows.map(r => r.i)).size} produtos`;
  $("max").textContent = top ? money(top.p) : "—";
  $("maxName").textContent = top ? `${top.label} · ${top.lota}` : "—";
  $("marketsCount").textContent = new Set(rows.map(r => r.l)).size;
  $("datePill").textContent = longDate(day);

  drawTop(rows);
  drawLotas(base, lota);
  drawFreshness(rows);
  drawSizes(rows);
  drawTrend(esp, lota, token);

  // Tabela
  const sorted = [...rows].sort((a, b) => b.p - a.p);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const tbody = $("rows");
  tbody.innerHTML = "";
  sorted.slice(start, start + pageSize).forEach(r => {
    const tr = document.createElement("tr");
    [r.lota, r.especie, r.t ? "T" + r.t : "—", r.f ? FRESH[r.f] : "—"].forEach(v => {
      const td = document.createElement("td"); td.textContent = v; tr.append(td);
    });
    const price = document.createElement("td");
    price.className = "price"; price.textContent = money(r.p);
    tr.append(price); tbody.append(tr);
  });
  $("empty").hidden = rows.length !== 0;
  $("status").textContent = rows.length
    ? `A mostrar ${start + 1}–${Math.min(start + pageSize, rows.length)} de ${rows.length} registos.`
    : "Não foram encontrados registos.";
  $("pageInfo").textContent = `Página ${currentPage} de ${totalPages}`;
  $("prevPage").disabled = currentPage === 1;
  $("nextPage").disabled = currentPage === totalPages;
}

/* ------------------------------------------------------------ Santos Populares */

const FESTAS = {
  "santo-antonio": { nome: "Santo António", mes: 5, dia: 13 },
  "sao-joao": { nome: "São João", mes: 5, dia: 24 },
  "sao-pedro": { nome: "São Pedro", mes: 5, dia: 29 }
};
const WINDOW_BEFORE = 30, WINDOW_AFTER = 15;
let santosReady = false, santosToken = 0;

const shiftDate = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = iso => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12);

function santosWindow(year, festaKey) {
  const f = FESTAS[festaKey] || FESTAS["santo-antonio"];
  const event = new Date(year, f.mes, f.dia, 12);
  return { event, start: shiftDate(event, -WINDOW_BEFORE), end: shiftDate(event, WINDOW_AFTER) };
}

function santosDaysWithData(year, festaKey) {
  const { start, end } = santosWindow(year, festaKey);
  return manifest.days.map(d => d.d).filter(d => { const x = dateOf(d); return x >= start && x <= end; });
}

function fillSantosProducts() {
  const esp = $("santos-especie").value;
  const options = esp
    ? itemInfo.map((it, i) => [i, it]).filter(([, it]) => it.esp === esp).map(([i, it]) => [String(i), it.label])
    : [];
  fillSelect("santos-produto", options, esp ? "Todos os produtos (média)" : "Escolhe uma espécie");
  $("santos-produto").value = "";
}

function initSantos() {
  const festaKey = $("santos-festa").value;
  const now = new Date(), thisYear = now.getFullYear();
  const upcoming = now > shiftDate(new Date(thisYear, 5, 29, 12), WINDOW_AFTER) ? thisYear + 1 : thisYear;
  const firstYear = +manifest.days[0].d.slice(0, 4), lastYear = +manifest.days[manifest.days.length - 1].d.slice(0, 4);
  const years = [];
  for (let y = Math.max(upcoming, lastYear); y >= Math.min(firstYear, upcoming); y--) years.push(String(y));
  fillSelect("santos-ano", years.map(y => [y, y]), null);
  const best = years.map(y => [y, santosDaysWithData(+y, festaKey).length]).sort((a, b) => b[1] - a[1])[0];
  $("santos-ano").value = best && best[1] > 0 ? best[0] : String(upcoming);

  fillSelect("santos-especie", speciesList, "Todas as espécies");
  const sardine = speciesList.find(([, name]) => /sardinh/i.test(name));
  if (sardine) $("santos-especie").value = sardine[0];
  fillSantosProducts();
  fillSelect("santos-lota", manifest.lotas.map((l, i) => [String(i), l.n]), "Todas as lotas");
  santosReady = true;
}

async function renderSantos() {
  if (!santosReady) initSantos();
  const token = ++santosToken;
  const festaKey = $("santos-festa").value, year = +$("santos-ano").value;
  const esp = $("santos-especie").value, prod = $("santos-produto").value, lota = $("santos-lota").value;
  const { event, start, end } = santosWindow(year, festaKey);
  const span = WINDOW_BEFORE + WINDOW_AFTER + 1;
  const dayList = santosDaysWithData(year, festaKey);

  const setKpi = (id, value, detail) => { $(id).textContent = value; if (detail !== undefined) $(id + "-detalhe").textContent = detail; };
  const noData = text => {
    if (charts.santos) { charts.santos.destroy(); delete charts.santos; }
    $("santos-wrap").hidden = true;
    $("santos-vazio").hidden = false; $("santos-vazio").textContent = text;
    setKpi("santos-antes", "—", "\u00a0"); setKpi("santos-durante", "—", "\u00a0");
    setKpi("santos-variacao", "—", "Dados insuficientes para comparar"); setKpi("santos-registos", "0", `0 de ${span} dias`);
    $("santos-mensagem").textContent = "";
  };

  if (!dayList.length) {
    return noData(`Ainda não há dados para esta janela (${longDate(isoOf(start))} a ${longDate(isoOf(end))}). ` +
                  `A recolha começou a ${longDate(manifest.days[0].d)}.`);
  }
  let maps;
  try { maps = await Promise.all([...new Set(dayList.map(d => d.slice(0, 7)))].map(loadMonth)); }
  catch (err) { return showError("Não foi possível carregar os dados da janela (" + err.message + ")."); }
  if (token !== santosToken) return;

  const daily = new Map(); let records = 0;
  dayList.forEach(day => {
    const rs = maps.map(m => m.get(day)).find(Boolean) || [];
    const prices = rs.filter(r => (!esp || itemInfo[r[2]].esp === esp) && (prod === "" || String(r[2]) === prod) &&
                                  (lota === "" || String(r[1]) === lota)).map(r => r[3]);
    if (prices.length) { daily.set(day, mean(prices)); records += prices.length; }
  });
  if (!daily.size) return noData("Há dados nesta janela, mas nenhum corresponde à combinação de filtros escolhida.");

  $("santos-wrap").hidden = false; $("santos-vazio").hidden = true;
  const offset = day => Math.round((dateOf(day) - event) / 86400000);
  const pick = (lo, hi) => [...daily].filter(([d]) => { const n = offset(d); return n >= lo && n <= hi; }).map(([, v]) => v);
  const before = pick(-WINDOW_BEFORE, -8), around = pick(-7, 7);
  setKpi("santos-antes", before.length ? money(mean(before)) : "—", `${before.length} dias com dados`);
  setKpi("santos-durante", around.length ? money(mean(around)) : "—", `${around.length} dias com dados`);
  setKpi("santos-registos", String(records), `${daily.size} de ${span} dias com dados`);
  if (before.length >= 3 && around.length >= 3) {
    const change = mean(around) / mean(before) - 1;
    setKpi("santos-variacao", pct(change, 1),
      change > 0 ? "Aumento face ao período anterior" : change < 0 ? "Redução face ao período anterior" : "Sem variação entre as médias");
  } else {
    setKpi("santos-variacao", "—", "São precisos pelo menos 3 dias com dados em cada período");
  }

  const labels = [], values = [];
  for (let n = -WINDOW_BEFORE; n <= WINDOW_AFTER; n++) {
    const d = shiftDate(event, n);
    labels.push(`${n > 0 ? "+" : ""}${n} · ${d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}`);
    values.push(daily.has(isoOf(d)) ? daily.get(isoOf(d)) : null);
  }
  makeChart("santos", "santos-chart", {
    type: "line",
    data: { labels, datasets: [{ label: "Preço médio", data: values, borderColor: GREEN, backgroundColor: "rgba(43,128,104,.12)",
                                  borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, spanGaps: false, tension: .2, fill: true }] },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => (c.raw == null ? " Sem registo" : " " + money(c.raw)) } } },
      scales: { x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0 }, title: { display: true, text: "Dias relativamente à festa (dia 0 = festa)" } },
                y: { beginAtZero: true, title: { display: true, text: "Preço médio (€)" }, ticks: { callback: v => money(v) } } }
    }
  });
  $("santos-mensagem").textContent =
    `${records} registos em ${daily.size} dos ${span} dias, entre ${isoOf(start)} e ${isoOf(end)}. Dias sem recolha não são estimados.` +
    (esp === "" ? " A média de todas as espécies mistura produtos de preços muito diferentes; escolhe uma espécie." :
     prod === "" ? " A média mistura calibres e frescuras; escolhe um produto para uma comparação mais rigorosa." : "");
}

function selecionarSeparador(which) {
  const diario = which === "diario";
  $("panel-diario").hidden = !diario;
  $("panel-sazonalidade").hidden = diario;
  $("tab-diario").setAttribute("aria-selected", String(diario));
  $("tab-sazonalidade").setAttribute("aria-selected", String(!diario));
  if (diario) Object.values(charts).forEach(c => c.resize());
  else renderSantos();
}

/* ------------------------------------------------------------------- arranque */

async function init() {
  manifest = await getJSON(DATA + "manifest.json");
  if (!manifest.days.length) throw new Error("não há dias com dados");
  lotaNames = manifest.lotas.map(l => l.n);
  itemInfo = manifest.items.map(([esp, t, f]) => {
    const especie = manifest.species[esp] || esp;
    const label = especie + (t ? ` T${t}` : "") + (f ? ` ${FRESH[f]}` : "");
    return { esp, t, f, especie, label, hay: plain(`${especie} t${t}`) };
  });
  speciesList = Object.entries(manifest.species).sort((a, b) => a[1].localeCompare(b[1], "pt-PT"));

  const days = manifest.days.map(d => d.d).reverse();
  fillSelect("day", manifest.days.slice().reverse().map(d => [d.d, `${d.d} · ${d.lotas} ${d.lotas === 1 ? "lota" : "lotas"}`]), null);
  $("day").value = days[0];
  fillSelect("market", manifest.lotas.map((l, i) => [String(i), l.n]), "Todas as lotas");
  fillSelect("species", speciesList, "Todas as espécies");
  $("generated").textContent = "Dados atualizados a " + new Date(manifest.generated_at).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" }) + ".";

  ["day", "market", "species", "search"].forEach(id =>
    $(id).addEventListener(id === "search" ? "input" : "change", () => { currentPage = 1; renderMain(); }));
  $("pageSize").addEventListener("change", () => { pageSize = Number($("pageSize").value); currentPage = 1; renderMain(); });
  $("prevPage").addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderMain(); } });
  $("nextPage").addEventListener("click", () => { currentPage++; renderMain(); });

  $("tab-diario").addEventListener("click", () => selecionarSeparador("diario"));
  $("tab-sazonalidade").addEventListener("click", () => selecionarSeparador("sazonalidade"));
  ["santos-ano", "santos-lota", "santos-produto"].forEach(id => $(id).addEventListener("change", renderSantos));
  $("santos-especie").addEventListener("change", () => { fillSantosProducts(); renderSantos(); });
  $("santos-festa").addEventListener("change", () => {
    // ao trocar de festa, escolhe o ano com mais dados nessa janela
    const f = $("santos-festa").value;
    const best = [...$("santos-ano").options].map(o => [o.value, santosDaysWithData(+o.value, f).length]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] > 0) $("santos-ano").value = best[0];
    renderSantos();
  });

  Chart.defaults.color = "#61716b";
  Chart.defaults.borderColor = "#e3ebe7";
  await renderMain();
}

init().catch(err => {
  console.error(err);
  showError(location.protocol === "file:"
    ? "Este site não funciona se abrires o index.html diretamente (file://). Dentro da pasta site, corre `python -m http.server 8000` e abre http://localhost:8000."
    : "Não foi possível carregar os dados. Corre `python build_json.py` e confirma que site/data/manifest.json existe. (" + err.message + ")");
  $("status").textContent = "";
});