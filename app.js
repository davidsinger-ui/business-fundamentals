const COMPANIES = [
  ['Microsoft', 'MSFT'], ['Berkshire Hathaway', 'BRK-B'], ['Costco', 'COST'],
  ['Alphabet', 'GOOGL'], ['Visa', 'V'], ['Amazon', 'AMZN'], ['S&P Global', 'SPGI'],
  ['Apple', 'AAPL'], ['Meta', 'META'], ['Adobe', 'ADBE'], ['Nvidia', 'NVDA'],
  ['Netflix', 'NFLX'], ['Disney', 'DIS'], ['MSCI', 'MSCI'], ["Moody's", 'MCO'],
  ['Mastercard', 'MA'], ['American Express', 'AXP'], ['JPMorgan Chase', 'JPM'],
  ['Allianz', 'ALV.DE'], ['Lockheed Martin', 'LMT'], ['Johnson & Johnson', 'JNJ'],
  ['Beiersdorf', 'BEI.DE'], ['Henkel', 'HEN3.DE'], ['Procter & Gamble', 'PG'],
  ["McDonald's", 'MCD'], ['Linde', 'LIN'], ['Chevron', 'CVX'], ['Rio Tinto', 'RIO'],
  ['Realty Income REIT', 'O'], ['Dino Polska', 'DNP.WA'],
];

const METRICS = [
  ['Revenue', (i, c) => i.revenue],
  ['Operating Income', (i, c) => i.operatingIncome],
  ['Operating Margin', (i, c) => (i.revenue ? i.operatingIncome / i.revenue : null)],
  ['Net Income', (i, c) => i.netIncome],
  ['Diluted EPS', (i, c) => i.epsdiluted ?? i.eps],
  ['Cash from operating activities', (i, c) => c.operatingCashFlow],
  ['Capex', (i, c) => c.capitalExpenditure],
  ['Stock Based Compensation', (i, c) => c.stockBasedCompensation],
  ['Free Cash Flow', (i, c) => c.freeCashFlow ?? ((c.operatingCashFlow ?? 0) + (c.capitalExpenditure ?? 0))],
];

const select = document.getElementById('company-select');
const apiInput = document.getElementById('api-key');
const loadBtn = document.getElementById('load-btn');
const statusEl = document.getElementById('status');
const nameEl = document.getElementById('company-name');
const chartsEl = document.getElementById('charts');
const charts = [];

for (const [name, ticker] of COMPANIES) {
  const option = document.createElement('option');
  option.value = ticker;
  option.textContent = `${name} (${ticker})`;
  select.appendChild(option);
}

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.length = 0;
  chartsEl.innerHTML = '';
}

function format(v, metric) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'N/A';
  if (metric === 'Operating Margin') return `${(v * 100).toFixed(2)}%`;
  if (metric === 'Diluted EPS') return v.toFixed(2);
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toFixed(2);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
    data: {
      labels: years,
      datasets: [{ data: values, backgroundColor: color }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => format(ctx.parsed.y, metric) } },
      },
      scales: {
        y: {
          ticks: { callback: (v) => format(v, metric) },
        },
      },
    },
  });
  charts.push(chart);
}

async function loadFundamentals() {
  const key = apiInput.value.trim();
  if (!key) {
    statusEl.textContent = 'Please enter your Financial Modeling Prep API key.';
    return;
  }

  destroyCharts();
  const ticker = select.value;
  nameEl.textContent = select.options[select.selectedIndex].textContent;
  statusEl.textContent = 'Loading data...';

  try {
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=10&apikey=${encodeURIComponent(key)}`;
    const cashUrl = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=annual&limit=10&apikey=${encodeURIComponent(key)}`;

    const [income, cash] = await Promise.all([fetchJson(incomeUrl), fetchJson(cashUrl)]);
    if (!Array.isArray(income) || income.length === 0) throw new Error('No income statement data found.');
    if (!Array.isArray(cash) || cash.length === 0) throw new Error('No cash flow data found.');

    const cashByDate = Object.fromEntries(cash.map((x) => [x.date, x]));
    const rows = income
      .slice(0, 10)
      .map((i) => ({ i, c: cashByDate[i.date] || {} }))
      .reverse();

    const years = rows.map((r) => r.i.calendarYear || r.i.date.slice(0, 4));
    const palette = ['#1d4ed8', '#0891b2', '#16a34a', '#9333ea', '#dc2626', '#d97706'];

    METRICS.forEach(([metric, getter], idx) => {
      const values = rows.map(({ i, c }) => getter(i, c));
      makeChart(metric, years, values, palette[idx % palette.length]);
    });

    statusEl.textContent = `Loaded ${rows.length} annual periods for ${ticker}.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}

loadBtn.addEventListener('click', loadFundamentals);
