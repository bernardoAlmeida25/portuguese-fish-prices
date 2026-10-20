const DATA_URL = "../data/fish_prices.json";

let allRows = [];
let speciesChart = null;
let marketChart = null;
let currentPage = 1;
let pageSize = 10;

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR"
}).format(n);

function parseData(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || []);
  return rows
    .map(r => ({ ...r, preco_medio_eur: Number(r.preco_medio_eur) }))
    .filter(r => r.data && Number.isFinite(r.preco_medio_eur));
}

function fillSelect(id, values, firstLabel) {
  const el = $(id);
  const previous = el.value;
  el.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = firstLabel;
  el.append(first);

  [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-PT"))
    .forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      el.append(option);
    });

  if ([...el.options].some(option => option.value === previous)) {
    el.value = previous;
  }
}

function filteredRows() {
  const day = $("day").value;
  const market = $("market").value;
  const species = $("species").value;
  const query = $("search").value.trim().toLocaleLowerCase("pt-PT");

  return allRows.filter(row =>
    (!day || row.data === day) &&
    (!market || row.lota === market) &&
    (!species || row.especie === species) &&
    (!query || [row.nome, row.especie, row.lota, row.calibre]
      .join(" ")
      .toLocaleLowerCase("pt-PT")
      .includes(query))
  );
}

function average(rows) {
  return rows.length
    ? rows.reduce((sum, row) => sum + row.preco_medio_eur, 0) / rows.length
    : 0;
}

function drawChart(existing, canvasId, labels, data, horizontal = false) {
  if (existing) existing.destroy();

  const canvas = $(canvasId);
  if (!canvas) return null;

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: "#2b8068",
        borderRadius: 5,
        maxBarThickness: 25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? "y" : "x",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => " " + money(Number(context.raw))
          }
        }
      },
      scales: {
        x: horizontal ? {
          type: "linear",
          beginAtZero: true,
          title: { display: true, text: "Preço médio (€)" },
          grid: { display: true },
          ticks: {
            stepSize: 1,
            maxTicksLimit: 12,
            callback: value => money(Number(value))
          }
        } : {
          type: "category",
          title: { display: true, text: "Lota" },
          grid: { display: false },
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: horizontal ? {
          type: "category",
          title: { display: true, text: "Espécie" },
          grid: { display: false },
          ticks: { autoSkip: false }
        } : {
          type: "linear",
          beginAtZero: true,
          title: { display: true, text: "Preço médio (€)" },
          grid: { display: true },
          ticks: {
            stepSize: 1,
            maxTicksLimit: 12,
            callback: value => money(Number(value))
          }
        }
      }
    }
  });
}

function render() {
  const rows = filteredRows();
  const avg = average(rows);
  const maxRow = rows.reduce(
    (best, row) => !best || row.preco_medio_eur > best.preco_medio_eur ? row : best,
    null
  );

  $("avg").textContent = rows.length ? money(avg) : "—";
  $("count").textContent = rows.length.toLocaleString("pt-PT");
  $("max").textContent = maxRow ? money(maxRow.preco_medio_eur) : "—";
  $("maxName").textContent = maxRow ? `${maxRow.especie} · ${maxRow.lota}` : "—";
  $("marketsCount").textContent = new Set(rows.map(row => row.lota)).size;
  $("datePill").textContent = $("day").value || "Todas as datas";

  const bySpecies = new Map();
  rows.forEach(row => {
    if (!bySpecies.has(row.especie)) bySpecies.set(row.especie, []);
    bySpecies.get(row.especie).push(row.preco_medio_eur);
  });

  const topSpecies = [...bySpecies]
    .map(([name, values]) => ({
      name,
      avg: values.reduce((sum, value) => sum + value, 0) / values.length
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  speciesChart = drawChart(
    speciesChart,
    "speciesChart",
    topSpecies.map(item => item.name),
    topSpecies.map(item => Number(item.avg.toFixed(2))),
    true
  );

  const byMarket = new Map();
  rows.forEach(row => {
    if (!byMarket.has(row.lota)) byMarket.set(row.lota, []);
    byMarket.get(row.lota).push(row.preco_medio_eur);
  });

  const topMarkets = [...byMarket]
    .map(([name, values]) => ({
      name,
      avg: values.reduce((sum, value) => sum + value, 0) / values.length
    }))
    .sort((a, b) => b.avg - a.avg);

  marketChart = drawChart(
    marketChart,
    "marketChart",
    topMarkets.map(item => item.name),
    topMarkets.map(item => Number(item.avg.toFixed(2)))
  );

  const tbody = $("rows");
  tbody.innerHTML = "";

  const sortedRows = [...rows].sort(
    (a, b) => b.preco_medio_eur - a.preco_medio_eur
  );
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(startIndex, startIndex + pageSize);

  pageRows.forEach(row => {
    const tr = document.createElement("tr");

    [row.lota, row.especie, row.calibre || "—", row.nome].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value ?? "—";
      tr.append(td);
    });

    const price = document.createElement("td");
    price.className = "price";
    price.textContent = money(row.preco_medio_eur);
    tr.append(price);
    tbody.append(tr);
  });

  $("empty").hidden = rows.length !== 0;
  $("status").textContent = rows.length
    ? `A mostrar ${startIndex + 1}–${Math.min(startIndex + pageSize, rows.length)} de ${rows.length} registos.`
    : "Não foram encontrados registos.";

  $("pageInfo").textContent = `Página ${currentPage} de ${totalPages}`;
  $("prevPage").disabled = currentPage === 1;
  $("nextPage").disabled = currentPage === totalPages;
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    allRows = parseData(await response.text());

    const days = [...new Set(allRows.map(row => row.data))].sort().reverse();
    fillSelect("day", days, "Escolher todas as datas");
    if (days.length) $("day").value = days[0];

    fillSelect("market", allRows.map(row => row.lota), "Todas as lotas");
    fillSelect("species", allRows.map(row => row.especie), "Todas as espécies");

    ["day", "market", "species", "search"].forEach(id => {
      $(id).addEventListener(id === "search" ? "input" : "change", () => {
        currentPage = 1;
        render();
      });
    });

    $("pageSize").addEventListener("change", () => {
      pageSize = Number($("pageSize").value);
      currentPage = 1;
      render();
    });

    $("prevPage").addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        render();
      }
    });

    $("nextPage").addEventListener("click", () => {
      currentPage++;
      render();
    });

    $("status").textContent =
      `Dados carregados do JSON: ${allRows.length} registos · última data disponível: ${days[0] || "—"}.`;

    render();
  } catch (error) {
    $("status").textContent =
      "Não foi possível carregar os dados. Confirma que data/fish_prices.json existe e que o site está publicado. (" +
      error.message + ")";
    $("empty").hidden = false;
  }
}



// Santos Populares: mantém os gráficos principais e acrescenta a análise sazonal.
let santosChart = null;
const FESTAS_POPULARES = {
  "santo-antonio": { nome: "Santo António", mes: 5, dia: 13 },
  "sao-joao": { nome: "São João", mes: 5, dia: 24 },
  "sao-pedro": { nome: "São Pedro", mes: 5, dia: 29 }
};
const santosMoney = n => new Intl.NumberFormat("pt-PT", {style:"currency",currency:"EUR",maximumFractionDigits:2}).format(n);
const santosDate = value => { const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1],+m[2]-1,+m[3],12) : null; };
const santosISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const santosShift = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function santosFill(id, values, placeholder) {
  const el=$(id), old=el.value; el.innerHTML="";
  const first=document.createElement("option"); first.value=""; first.textContent=placeholder; el.append(first);
  [...new Set(values.filter(v=>v!==undefined&&v!==null&&String(v).trim()!==""))].sort((a,b)=>String(a).localeCompare(String(b),"pt-PT")).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.append(o);});
  if ([...el.options].some(o=>o.value===old)) el.value=old;
}
function inicializarSazonalidade(){
  const years=[...new Set([...allRows.map(r=>santosDate(r.data)?.getFullYear()).filter(Boolean),new Date().getFullYear(),new Date().getFullYear()+1])].sort((a,b)=>b-a);
  santosFill("santos-ano",years.map(String),"Escolher ano");
  const yearsWithData=allRows.map(r=>santosDate(r.data)?.getFullYear()).filter(Boolean);
  $("santos-ano").value=String(yearsWithData.length?Math.max(...yearsWithData):new Date().getFullYear());
  santosFill("santos-especie",allRows.map(r=>r.especie||r.nome),"Todas as espécies");
  const sard=[...$("santos-especie").options].find(o=>/sardinh/i.test(o.value)); if(sard) $("santos-especie").value=sard.value;
  santosFill("santos-lota",allRows.map(r=>r.lota),"Todas as lotas");
}
function renderSazonalidade(){
  if (!$("santos-ano") || !$("santos-ano").value) return;
  const festa=FESTAS_POPULARES[$("santos-festa").value]||FESTAS_POPULARES["santo-antonio"];
  const year=Number($("santos-ano").value), eventDate=new Date(year,festa.mes,festa.dia,12);
  const start=santosShift(eventDate,-30), end=santosShift(eventDate,15), species=$("santos-especie").value, lota=$("santos-lota").value;
  const selected=allRows.filter(r=>{const d=santosDate(r.data);return d&&d>=start&&d<=end&&(!species||(r.especie||r.nome)===species)&&(!lota||r.lota===lota)&&Number.isFinite(Number(r.preco_medio_eur));});
  const daily=new Map(); selected.forEach(r=>{const k=santosISO(santosDate(r.data));if(!daily.has(k))daily.set(k,[]);daily.get(k).push(Number(r.preco_medio_eur));});
  const dailyPoints=[...daily].map(([date,vals])=>({date,price:vals.reduce((a,b)=>a+b,0)/vals.length,count:vals.length})).sort((a,b)=>a.date.localeCompare(b.date));
  const offset=d=>Math.round((d-eventDate)/86400000), mean=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
  const before=mean(dailyPoints.filter(p=>{const n=offset(santosDate(p.date));return n>=-30&&n<=-8;}).map(p=>p.price));
  const around=mean(dailyPoints.filter(p=>{const n=offset(santosDate(p.date));return n>=-7&&n<=7;}).map(p=>p.price));
  $("santos-antes").textContent=before===null?"—":santosMoney(before); $("santos-durante").textContent=around===null?"—":santosMoney(around); $("santos-registos").textContent=String(selected.length);
  if(before!==null&&around!==null&&before!==0){const change=(around-before)/before*100;$("santos-variacao").textContent=`${change>0?"+":""}${change.toLocaleString("pt-PT",{maximumFractionDigits:1,minimumFractionDigits:1})}%`;$("santos-variacao-detalhe").textContent=change>0?"Aumento face ao período anterior":change<0?"Redução face ao período anterior":"Sem variação entre as médias";}else{$("santos-variacao").textContent="—";$("santos-variacao-detalhe").textContent="Dados insuficientes para comparar";}
  const labels=[], values=[]; for(let n=-30;n<=15;n++){const d=santosShift(eventDate,n);labels.push(`${n>0?"+":""}${n} · ${d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}`);const hit=daily.get(santosISO(d));values.push(hit&&hit.length?hit.reduce((a,b)=>a+b,0)/hit.length:null);}
  if(santosChart)santosChart.destroy();
  santosChart=new Chart($("santos-chart"),{type:"line",data:{labels,datasets:[{label:"Preço médio",data:values,borderColor:"#2b8068",backgroundColor:"rgba(43,128,104,.12)",borderWidth:2,pointRadius:2,pointHoverRadius:5,spanGaps:false,tension:.2,fill:true}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw==null?" Sem registo":` ${santosMoney(c.raw)}`}}},scales:{x:{ticks:{autoSkip:true,maxTicksLimit:12,maxRotation:0},title:{display:true,text:"Dias relativamente à festa (dia 0 = festa)"}},y:{beginAtZero:true,title:{display:true,text:"Preço médio (€)"},ticks:{callback:v=>santosMoney(v)}}}}});
  $("santos-mensagem").textContent=selected.length?`${selected.length} registos reais entre ${santosISO(start)} e ${santosISO(end)}. Dias sem recolha não são estimados.`:`Ainda não existem registos para esta combinação de filtros entre ${santosISO(start)} e ${santosISO(end)}. O gráfico será preenchido quando o JSON incluir dados desse período.`;
}
function selecionarSeparador(which){const diario=which==="diario";$("panel-diario").hidden=!diario;$("panel-sazonalidade").hidden=diario;$("tab-diario").setAttribute("aria-selected",String(diario));$("tab-sazonalidade").setAttribute("aria-selected",String(!diario));if(!diario&&santosChart)santosChart.resize();if(diario){if(speciesChart)speciesChart.resize();if(marketChart)marketChart.resize();}}
$("tab-diario").addEventListener("click",()=>selecionarSeparador("diario"));
$("tab-sazonalidade").addEventListener("click",()=>selecionarSeparador("sazonalidade"));
["santos-festa","santos-ano","santos-especie","santos-lota"].forEach(id=>$(id).addEventListener("change",renderSazonalidade));
init().then(()=>{inicializarSazonalidade();renderSazonalidade();});
