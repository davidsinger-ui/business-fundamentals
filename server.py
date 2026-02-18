from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent
PORT = 8000

COMPANIES = {
    "MSFT": "Microsoft",
    "BRK-B": "Berkshire Hathaway",
    "COST": "Costco",
    "GOOGL": "Alphabet",
    "V": "Visa",
    "AMZN": "Amazon",
    "SPGI": "S&P Global",
    "AAPL": "Apple",
    "META": "Meta",
    "ADBE": "Adobe",
    "NVDA": "Nvidia",
    "NFLX": "Netflix",
    "DIS": "Disney",
    "MSCI": "MSCI",
    "MCO": "Moody's",
    "MA": "Mastercard",
    "AXP": "American Express",
    "JPM": "JPMorgan Chase",
    "ALV.DE": "Allianz",
    "LMT": "Lockheed Martin",
    "JNJ": "Johnson & Johnson",
    "BEI.DE": "Beiersdorf",
    "HEN3.DE": "Henkel",
    "PG": "Procter & Gamble",
    "MCD": "McDonald's",
    "LIN": "Linde",
    "CVX": "Chevron",
    "RIO": "Rio Tinto",
    "O": "Realty Income REIT",
    "DNP.WA": "Dino Polska",
}

TYPES = {
    "Revenue": ["annualTotalRevenue"],
    "Operating Income": ["annualOperatingIncome"],
    "Operating Margin": ["annualOperatingProfitMargin", "annualOperatingMargin"],
    "Net Income": ["annualNetIncome", "annualNetIncomeCommonStockholders"],
    "Diluted EPS": ["annualDilutedEPS", "annualBasicEPS"],
    "Cash from operating activities": ["annualOperatingCashFlow"],
    "Capex": ["annualCapitalExpenditure"],
    "Stock Based Compensation": ["annualStockBasedCompensation"],
    "Free Cash Flow": ["annualFreeCashFlow"],
}


def epoch(year: int) -> int:
    return int(datetime(year, 1, 1).timestamp())


def fetch_yahoo_timeseries(ticker: str) -> Dict:
    all_types = sorted({item for values in TYPES.values() for item in values})
    params = {
        "type": ",".join(all_types),
        "period1": str(epoch(datetime.now().year - 12)),
        "period2": str(epoch(datetime.now().year + 1)),
        "merge": "false",
        "padTimeSeries": "false",
    }
    base = f"https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{urllib.parse.quote(ticker)}"
    url = f"{base}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload


def extract_series(payload: Dict) -> Dict[str, List[float | None]]:
    result = payload.get("timeseries", {}).get("result", [])
    per_type: Dict[str, Dict[str, float]] = {}

    for item in result:
        data_type = item.get("meta", {}).get("type")
        if not data_type:
            continue
        values = {}
        for row in item.get(data_type, []):
            date = row.get("asOfDate")
            raw = row.get("reportedValue", {}).get("raw")
            if date and raw is not None:
                values[date] = float(raw)
        per_type[data_type] = values

    years = sorted({d for vals in per_type.values() for d in vals.keys()})[-10:]
    metrics: Dict[str, List[float | None]] = {name: [] for name in TYPES}

    for as_of in years:
        revenue = None
        op_income = None
        for key in TYPES["Revenue"]:
            if as_of in per_type.get(key, {}):
                revenue = per_type[key][as_of]
        for key in TYPES["Operating Income"]:
            if as_of in per_type.get(key, {}):
                op_income = per_type[key][as_of]

        for metric, candidates in TYPES.items():
            value = None
            for candidate in candidates:
                if as_of in per_type.get(candidate, {}):
                    value = per_type[candidate][as_of]
                    break
            metrics[metric].append(value)

        if metrics["Operating Margin"][-1] is None and revenue not in (None, 0) and op_income is not None:
            metrics["Operating Margin"][-1] = op_income / revenue

        if metrics["Free Cash Flow"][-1] is None:
            cfo = metrics["Cash from operating activities"][-1]
            capex = metrics["Capex"][-1]
            if cfo is not None and capex is not None:
                metrics["Free Cash Flow"][-1] = cfo + capex

    return {"years": [d[:4] for d in years], "metrics": metrics}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/companies":
            return self.send_json(
                [{"ticker": ticker, "name": name} for ticker, name in COMPANIES.items()]
            )

        if parsed.path.startswith("/api/financials/"):
            ticker = urllib.parse.unquote(parsed.path.split("/")[-1]).upper()
            if ticker not in COMPANIES:
                return self.send_json({"error": "Unknown ticker"}, status=HTTPStatus.NOT_FOUND)
            try:
                payload = fetch_yahoo_timeseries(ticker)
                parsed_payload = extract_series(payload)
                return self.send_json({"ticker": ticker, **parsed_payload})
            except Exception as exc:  # noqa: BLE001
                return self.send_json(
                    {
                        "error": "Failed to fetch financial data from Yahoo Finance.",
                        "details": str(exc),
                    },
                    status=HTTPStatus.BAD_GATEWAY,
                )

        return super().do_GET()

    def send_json(self, data, status=HTTPStatus.OK):
        encoded = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def translate_path(self, path):
        rel = path.lstrip("/") or "index.html"
        return str(ROOT / rel)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Serving on http://localhost:{PORT}")
    server.serve_forever()
