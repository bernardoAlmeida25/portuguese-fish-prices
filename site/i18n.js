"use strict";

/*
 * Tradução PT <-> EN do site.
 *  - Texto estático: atributos data-i18n (texto), data-i18n-html (texto com ligações; só strings deste ficheiro)
 *    e data-i18n-attr="atributo:chave;outro:chave" (placeholder, aria-label, ...).
 *  - Texto dinâmico (app.js): I18N.t("chave", { parametros }) e I18N.tp("chave", n, { ... }) para plurais.
 *  - NÃO se traduzem: nomes das espécies e nomes das lotas (vêm dos dados e ficam sempre como estão).
 *  - Idioma: ?lang=en|pt  >  localStorage  >  português.
 */
(() => {
  const LOCALES = { pt: "pt-PT", en: "en-GB" };

  const DICT = {
    pt: {
      "meta.title": "Preços de Pescado em Portugal | Histórico e Estatísticas",
      "meta.description": "Consulta o histórico de preços de pescado em Portugal. Explora preços diários, compara espécies e lotas, analisa calibres e frescura e acompanha a evolução sazonal.",

      "lang.group": "Idioma / Language",
      "hero.title": "Preços de Pescado em Portugal",
      "hero.text": "Consulta o histórico de preços médios da primeira venda nas lotas portuguesas da Docapesca. Compara preços por data, lota, espécie, calibre e frescura, e explora tendências e variações sazonais.",
      "tabs.aria": "Secções do site",
      "tabs.prices": "Preços e gráficos",
      "tabs.santos": "Santos Populares",

      "filters.aria": "Filtros de preços",
      "f.day": "Data",
      "f.market": "Lota",
      "f.species": "Espécie",
      "f.search": "Pesquisar",
      "f.search.ph": "Espécie, lota ou calibre (ex.: T2)",
      "loading.days": "A carregar datas…",
      "loading.markets": "A carregar lotas…",
      "loading.species": "A carregar espécies…",
      "loading": "A carregar…",
      "loading.data": "A carregar os dados…",
      "loading.santos": "A carregar dados…",

      "stats.aria": "Resumo dos preços",
      "stat.median": "Preço mediano",
      "stat.median.d": "Mediana dos registos filtrados",
      "stat.records": "Registos",
      "stat.records.d": "Após aplicar os filtros",
      "stat.max": "Preço mais alto",
      "stat.markets": "Lotas",
      "stat.markets.d": "Com registos nos filtros atuais",

      "charts.aria": "Análise e comparação de preços",
      "top.h": "10 produtos mais caros",
      "top.note": "Um produto é uma espécie com um calibre (T) e uma frescura (E, A ou B). Mostra a mediana entre as lotas.",
      "top.aria": "Os 10 produtos com preço mais alto",
      "lota.h": "Que lotas vendem mais caro ou mais barato?",
      "lota.note": "Diferença face ao preço mediano de cada produto, só para produtos vendidos em duas ou mais lotas. Ignora o filtro de lota.",
      "lota.aria": "Diferença de preço de cada lota face à mediana",
      "fresh.h": "Quanto vale a frescura?",
      "fresh.note": "Preço de cada frescura face à categoria A, na mesma lota, espécie e calibre.",
      "fresh.aria": "Diferença de preço entre frescuras E, A e B",
      "size.h": "Quanto vale o calibre?",
      "size.note": "Preço de cada calibre face ao T1, na mesma lota, espécie e frescura.",
      "size.aria": "Diferença de preço entre calibres face ao T1",
      "trend.h": "Evolução do preço",
      "trend.aria": "Evolução do preço dos produtos da espécie escolhida",
      "trend.pick": "Escolhe uma espécie nos filtros para ver como mudaram os preços dos seus produtos nos últimos 90 dias.",

      "table.h": "Registos de preços",
      "th.market": "Lota",
      "th.species": "Espécie",
      "th.size": "Calibre",
      "th.fresh": "Frescura",
      "th.price": "Preço médio",
      "table.empty": "Não foram encontrados registos para os filtros selecionados.",
      "page.aria": "Paginação da tabela",
      "page.size": "Registos por página",
      "page.prev": "Anterior",
      "page.next": "Seguinte",
      "page.info": "Página {p} de {n}",

      "santos.h": "Análise sazonal dos preços durante os Santos Populares",
      "santos.intro": "Compara os preços nos 30 dias anteriores e nos 15 dias posteriores a Santo António, São João ou São Pedro. São usados apenas registos reais; dias sem recolha não são estimados.",
      "santos.filters.aria": "Filtros de sazonalidade",
      "sf.festa": "Festa",
      "sf.year": "Ano",
      "sf.species": "Espécie",
      "sf.product": "Produto",
      "sf.market": "Lota",
      "festa.antonio": "Santo António · 13 jun",
      "festa.joao": "São João · 24 jun",
      "festa.pedro": "São Pedro · 29 jun",
      "santos.stats.aria": "Resumo da festa",
      "ss.before": "Antes · -30 a -8 dias",
      "ss.around": "Em torno · -7 a +7 dias",
      "ss.change": "Variação entre períodos",
      "ss.records": "Registos no período",
      "santos.chart.h": "Evolução do preço médio em torno da festa",
      "santos.chart.p": "O dia 0 é o dia da festa. Dias sem recolha ficam sem valor — não são tratados como preços de zero euros. Para evitar efeitos de mistura de calibres, escolhe um produto concreto.",
      "santos.chart.aria": "Preço médio por dia em torno da festa",

      "foot.aria": "Fonte e metodologia",
      "foot.h": "Fonte dos dados e metodologia",
      "foot.p1": "Fonte: <a href=\"https://www.docapesca.pt/pt/estatisticas\" target=\"_blank\" rel=\"noopener noreferrer\">Docapesca — Estatísticas diárias</a>. Os valores representam preços médios em euros, tal como publicados. A tabela de origem não indica explicitamente a unidade dos preços; por isso, não se assume que correspondam a euros por quilograma.",
      "foot.p2": "As letras E, A e B correspondem ao campo de frescura dos dados (1, 2 e 3) e coincidem em todos os registos com a letra do nome do produto. O calibre T vem do próprio nome (T1, T2, …). Nos dias em que só algumas lotas foram recolhidas, as comparações entre lotas usam apenas as que têm dados disponíveis.",
      "foot.p3": "Os gráficos e as comparações dependem dos registos disponíveis para cada data e filtro. Dias sem dados não são estimados.",
      "generated": "Dados atualizados a {when}.",

      /* dinâmico */
      "all.markets": "Todas as lotas",
      "all.species": "Todas as espécies",
      "n.markets.one": "{n} lota",
      "n.markets.other": "{n} lotas",
      "coverage": "Neste dia só há dados de {n} das {total} lotas; as comparações entre lotas usam apenas essas.",
      "count.detail": "{s} espécies · {p} produtos",
      "status.range": "A mostrar {a}–{b} de {n} registos.",
      "status.none": "Não foram encontrados registos.",
      "no.record": "sem registo",
      "reference": "Referência",

      "top.empty": "Sem registos para os filtros escolhidos.",
      "top.tip": " · {n} lotas ({min} a {max})",
      "lota.msg": "Para comparar lotas são precisos pelo menos 2 lotas com 5 ou mais produtos em comum neste dia.",
      "lota.tip": " {pct} face à mediana · {n} produtos comparados",
      "lota.axis": "← mais barata · mais cara →",
      "fresh.msg": "Há poucos produtos com várias frescuras na mesma lota para comparar (mínimo: 3 pares).",
      "fresh.a": "A (referência)",
      "fresh.tip": " {pct} face ao A · {n} pares",
      "size.msg": "Há poucos produtos com vários calibres na mesma lota para comparar (mínimo: 3 pares por calibre).",
      "size.ref": "T1 (ref.)",
      "size.tip": " {pct} face ao T1 · {n} pares",

      "trend.err": "Não foi possível carregar o histórico ({msg}).",
      "trend.nodata": "Ainda não há dias suficientes para mostrar a evolução de {name}: são precisos pelo menos 2 dias com o mesmo produto.",
      "trend.nodata.market": "Ainda não há dias suficientes para mostrar a evolução de {name}: são precisos pelo menos 2 dias com o mesmo produto nesta lota.",
      "trend.note.market": "Preço dos produtos de {name} nos últimos 90 dias com dados na lota {market}.",
      "trend.note.all": "Preço dos produtos de {name} nos últimos 90 dias com dados: mediana entre as lotas com dados em cada dia. Se o número de lotas variar, escolhe uma lota para evitar saltos.",

      "santos.all.products": "Todos os produtos (média)",
      "santos.pick.species": "Escolhe uma espécie",
      "santos.nodata": "Ainda não há dados para esta janela ({from} a {to}). A recolha começou a {start}.",
      "santos.nomatch": "Há dados nesta janela, mas nenhum corresponde à combinação de filtros escolhida.",
      "santos.days": "{n} dias com dados",
      "santos.days.of": "{n} de {span} dias com dados",
      "santos.days.zero": "0 de {span} dias",
      "santos.insufficient": "Dados insuficientes para comparar",
      "santos.need3": "São precisos pelo menos 3 dias com dados em cada período",
      "santos.up": "Aumento face ao período anterior",
      "santos.down": "Redução face ao período anterior",
      "santos.flat": "Sem variação entre as médias",
      "santos.series": "Preço médio",
      "santos.x": "Dias relativamente à festa (dia 0 = festa)",
      "santos.y": "Preço médio (€)",
      "santos.no.record": "Sem registo",
      "santos.msg": "{records} registos em {days} dos {span} dias, entre {from} e {to}. Dias sem recolha não são estimados.",
      "santos.msg.allspecies": " A média de todas as espécies mistura produtos de preços muito diferentes; escolhe uma espécie.",
      "santos.msg.allproducts": " A média mistura calibres e frescuras; escolhe um produto para uma comparação mais rigorosa.",

      "err.day": "Não foi possível carregar os dados de {day} ({msg}).",
      "err.window": "Não foi possível carregar os dados da janela ({msg}).",
      "err.file": "Este site não funciona se abrires o index.html diretamente (file://). Dentro da pasta site, corre `python -m http.server 8000` e abre http://localhost:8000.",
      "err.load": "Não foi possível carregar os dados. Corre `python build_json.py` e confirma que site/data/manifest.json existe. ({msg})"
    },

    en: {
      "meta.title": "Fish Prices in Portugal | History and Statistics",
      "meta.description": "Explore the history of fish prices in Portugal. Browse daily prices, compare species and fish auctions, analyse size and freshness grades and follow seasonal trends.",

      "lang.group": "Idioma / Language",
      "hero.title": "Fish Prices in Portugal",
      "hero.text": "Explore the history of average first-sale prices at the Portuguese fish auctions run by Docapesca. Compare prices by date, fish auction, species, size and freshness, and explore trends and seasonal variations.",
      "tabs.aria": "Site sections",
      "tabs.prices": "Prices and charts",
      "tabs.santos": "Popular Saints festivals",

      "filters.aria": "Price filters",
      "f.day": "Date",
      "f.market": "Fish auction",
      "f.species": "Species",
      "f.search": "Search",
      "f.search.ph": "Species, auction or size (e.g. T2)",
      "loading.days": "Loading dates…",
      "loading.markets": "Loading fish auctions…",
      "loading.species": "Loading species…",
      "loading": "Loading…",
      "loading.data": "Loading data…",
      "loading.santos": "Loading data…",

      "stats.aria": "Price summary",
      "stat.median": "Median price",
      "stat.median.d": "Median of the filtered records",
      "stat.records": "Records",
      "stat.records.d": "After applying the filters",
      "stat.max": "Highest price",
      "stat.markets": "Fish auctions",
      "stat.markets.d": "With records under the current filters",

      "charts.aria": "Price analysis and comparison",
      "top.h": "10 most expensive products",
      "top.note": "A product is a species with a size grade (T) and a freshness grade (E, A or B). Shows the median across fish auctions.",
      "top.aria": "The 10 products with the highest price",
      "lota.h": "Which fish auctions sell dearer or cheaper?",
      "lota.note": "Difference from each product's median price, only for products sold at two or more fish auctions. Ignores the fish auction filter.",
      "lota.aria": "Price difference of each fish auction from the median",
      "fresh.h": "What is freshness worth?",
      "fresh.note": "Price of each freshness grade relative to grade A, at the same fish auction, species and size.",
      "fresh.aria": "Price difference between freshness grades E, A and B",
      "size.h": "What is size worth?",
      "size.note": "Price of each size grade relative to T1, at the same fish auction, species and freshness.",
      "size.aria": "Price difference between size grades relative to T1",
      "trend.h": "Price trend",
      "trend.aria": "Price trend of the products of the selected species",
      "trend.pick": "Choose a species in the filters to see how the prices of its products changed over the last 90 days.",

      "table.h": "Price records",
      "th.market": "Fish auction",
      "th.species": "Species",
      "th.size": "Size",
      "th.fresh": "Freshness",
      "th.price": "Average price",
      "table.empty": "No records found for the selected filters.",
      "page.aria": "Table pagination",
      "page.size": "Records per page",
      "page.prev": "Previous",
      "page.next": "Next",
      "page.info": "Page {p} of {n}",

      "santos.h": "Seasonal analysis of prices during the Popular Saints festivals (Santos Populares)",
      "santos.intro": "Compare prices in the 30 days before and the 15 days after Santo António, São João or São Pedro. Only real records are used; days without collection are not estimated.",
      "santos.filters.aria": "Seasonal filters",
      "sf.festa": "Festival",
      "sf.year": "Year",
      "sf.species": "Species",
      "sf.product": "Product",
      "sf.market": "Fish auction",
      "festa.antonio": "Santo António · 13 Jun",
      "festa.joao": "São João · 24 Jun",
      "festa.pedro": "São Pedro · 29 Jun",
      "santos.stats.aria": "Festival summary",
      "ss.before": "Before · -30 to -8 days",
      "ss.around": "Around · -7 to +7 days",
      "ss.change": "Change between periods",
      "ss.records": "Records in the period",
      "santos.chart.h": "Average price trend around the festival",
      "santos.chart.p": "Day 0 is the day of the festival. Days without collection have no value — they are not treated as prices of zero euros. To avoid mixing size and freshness grades, choose a specific product.",
      "santos.chart.aria": "Average price per day around the festival",

      "foot.aria": "Source and methodology",
      "foot.h": "Data source and methodology",
      "foot.p1": "Source: <a href=\"https://www.docapesca.pt/pt/estatisticas\" target=\"_blank\" rel=\"noopener noreferrer\">Docapesca — Daily statistics</a> (in Portuguese). Values are average prices in euros, as published. The source table does not state the unit of the prices, so they are not assumed to be euros per kilogram.",
      "foot.p2": "The letters E, A and B correspond to the freshness field in the data (1, 2 and 3) and match the letter in the product name in every record. The size grade (T1, T2, …) comes from the product name itself. On days when only some fish auctions were collected, comparisons between fish auctions use only those with available data.",
      "foot.p3": "Charts and comparisons depend on the records available for each date and filter. Days without data are not estimated. Species names and fish auction names are shown as published, in Portuguese; “lota” is the Portuguese word for a fish auction.",
      "generated": "Data updated on {when}.",

      "all.markets": "All fish auctions",
      "all.species": "All species",
      "n.markets.one": "{n} fish auction",
      "n.markets.other": "{n} fish auctions",
      "coverage": "On this day there is data for only {n} of the {total} fish auctions; comparisons between fish auctions use only those.",
      "count.detail": "{s} species · {p} products",
      "status.range": "Showing {a}–{b} of {n} records.",
      "status.none": "No records found.",
      "no.record": "no record",
      "reference": "Reference",

      "top.empty": "No records for the selected filters.",
      "top.tip": " · {n} fish auctions ({min} to {max})",
      "lota.msg": "To compare fish auctions you need at least 2 of them with 5 or more products in common on this day.",
      "lota.tip": " {pct} vs median · {n} products compared",
      "lota.axis": "← cheaper · more expensive →",
      "fresh.msg": "Too few products with several freshness grades at the same fish auction to compare (minimum: 3 pairs).",
      "fresh.a": "A (reference)",
      "fresh.tip": " {pct} vs A · {n} pairs",
      "size.msg": "Too few products with several size grades at the same fish auction to compare (minimum: 3 pairs per size).",
      "size.ref": "T1 (ref.)",
      "size.tip": " {pct} vs T1 · {n} pairs",

      "trend.err": "Could not load the history ({msg}).",
      "trend.nodata": "There are not yet enough days to show the trend for {name}: at least 2 days with the same product are needed.",
      "trend.nodata.market": "There are not yet enough days to show the trend for {name}: at least 2 days with the same product at this fish auction are needed.",
      "trend.note.market": "Prices of {name} products over the last 90 days with data at the {market} fish auction.",
      "trend.note.all": "Prices of {name} products over the last 90 days with data: median across the fish auctions with data on each day. If the number of fish auctions varies, choose one fish auction to avoid jumps.",

      "santos.all.products": "All products (average)",
      "santos.pick.species": "Choose a species",
      "santos.nodata": "There is no data for this window yet ({from} to {to}). Collection started on {start}.",
      "santos.nomatch": "There is data in this window, but none matches the selected filters.",
      "santos.days": "{n} days with data",
      "santos.days.of": "{n} of {span} days with data",
      "santos.days.zero": "0 of {span} days",
      "santos.insufficient": "Not enough data to compare",
      "santos.need3": "At least 3 days with data are needed in each period",
      "santos.up": "Increase vs the previous period",
      "santos.down": "Decrease vs the previous period",
      "santos.flat": "No change between the averages",
      "santos.series": "Average price",
      "santos.x": "Days relative to the festival (day 0 = festival day)",
      "santos.y": "Average price (€)",
      "santos.no.record": "No record",
      "santos.msg": "{records} records on {days} of the {span} days, between {from} and {to}. Days without collection are not estimated.",
      "santos.msg.allspecies": " The average across all species mixes products with very different prices; choose a species.",
      "santos.msg.allproducts": " The average mixes size and freshness grades; choose a product for a more rigorous comparison.",

      "err.day": "Could not load the data for {day} ({msg}).",
      "err.window": "Could not load the data for the window ({msg}).",
      "err.file": "This site does not work if you open index.html directly (file://). Inside the site folder, run `python -m http.server 8000` and open http://localhost:8000.",
      "err.load": "Could not load the data. Run `python build_json.py` and check that site/data/manifest.json exists. ({msg})"
    }
  };

  const listeners = [];
  let lang = detect();

  function detect() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "pt") return q;
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "pt") return saved;
    } catch (e) { /* localStorage indisponível: segue em português */ }
    return "pt";
  }

  const t = (key, params = {}) => {
    const raw = DICT[lang][key] ?? DICT.pt[key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ""));
  };
  const tp = (base, n, params = {}) => t(`${base}.${n === 1 ? "one" : "other"}`, { n, ...params });

  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    // data-i18n-html: só recebe strings constantes deste ficheiro (nunca dados externos)
    document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-attr]").forEach(el => {
      el.dataset.i18nAttr.split(";").forEach(pair => {
        const [attr, key] = pair.split(":");
        if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
    document.documentElement.lang = lang === "en" ? "en" : "pt-PT";
    document.title = t("meta.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.description"));
    document.querySelectorAll("[data-lang-btn]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang)));
  }

  function setLang(next) {
    if (next === lang || !DICT[next]) return;
    lang = next;
    try { localStorage.setItem("lang", lang); } catch (e) { /* ignora */ }
    applyStatic();
    listeners.forEach(fn => fn(lang));
  }

  window.I18N = {
    t, tp, setLang, applyStatic,
    onChange: fn => listeners.push(fn),
    get lang() { return lang; },
    get locale() { return LOCALES[lang]; }
  };

  document.querySelectorAll("[data-lang-btn]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.langBtn)));
  applyStatic();
})();
