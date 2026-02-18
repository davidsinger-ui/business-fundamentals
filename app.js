const METRICS = [
  'Revenue',
  'Operating Income',
  'Operating Margin',
  'Net Income',
  'Diluted EPS',
  'Cash from operating activities',
  'Capex',
  'Stock Based Compensation',
  'Free Cash Flow',
];

const select = document.getElementById('company-select');
const loadBtn = document.getElementById('load-btn');
const statusEl = document.getElementById('status');
const nameEl = document.getElementById('company-name');
const chartsEl = document.getElementById('charts');
const charts = [];

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.length = 0;
  chartsEl.innerHTML = '';
}

function format(v, metric) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'N/A';
  if (metric === 'Operating Margin') return `${(v * 100).toFixed(2)}%`;
  if (metric === 'Diluted EPS') return Number(v).toFixed(2);
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return Number(v).toFixed(2);
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.details || `HTTP ${res.status}`);
  return data;
}

function makeChart(metric, years, values, color) {
  const card = document.createElement('div');
  card.className = 'card';
  const h3 = document.createElement('h3');
  h3.textContent = metric;
  const canvas = document.createElement('canvas');
  card.append(h3, canvas);
  chartsEl.appendChild(card);

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: years, datasets: [{ data: values, backgroundColor: color }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => format(ctx.parsed.y, metric) } },
      },
      scales: {
        y: { ticks: { callback: (v) => format(v, metric) } },
      },
    },
  });
  charts.push(chart);
}

async function loadCompanies() {
  const companies = await fetchJson('/api/companies');
  for (const c of companies) {
    const option = document.createElement('option');
    option.value = c.ticker;
    option.textContent = `${c.name} (${c.ticker})`;
    select.appendChild(option);
  }
}

async function loadFundamentals() {
  const ticker = select.value;
  if (!ticker) {
    statusEl.textContent = 'Choose a company first.';
    return;
  }

  destroyCharts();
  nameEl.textContent = select.options[select.selectedIndex].textContent;
  statusEl.textContent = 'Loading data...';

  try {
    const data = await fetchJson(`/api/financials/${encodeURIComponent(ticker)}`);
    const years = data.years || [];
    const palette = ['#1d4ed8', '#0891b2', '#16a34a', '#9333ea', '#dc2626', '#d97706'];

    METRICS.forEach((metric, idx) => {
      makeChart(metric, years, data.metrics[metric] || [], palette[idx % palette.length]);
    });

    statusEl.textContent = `Loaded ${years.length} annual periods for ${ticker}.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}

loadBtn.addEventListener('click', loadFundamentals);
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadCompanies();
    await loadFundamentals();
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
});
