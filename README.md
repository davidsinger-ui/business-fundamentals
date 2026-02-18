# Portfolio Fundamentals Web App

This is a static web app that lets you view 10-year business fundamentals (annual) for your portfolio companies.

## What it shows
- Revenue
- Operating Income
- Operating Margin
- Net Income
- Diluted EPS
- Cash from operating activities
- Capex
- Stock Based Compensation
- Free Cash Flow

## Data source
The app pulls data from **Financial Modeling Prep** using your API key in the browser:
- Income statement endpoint
- Cash flow statement endpoint

## Run
```bash
python -m http.server 8000
```
Then open http://localhost:8000 and paste your FMP API key.

## Notes
- If a company or field is missing in the API, charts can contain empty bars.
- Foreign listings use exchange tickers (e.g. `ALV.DE`, `HEN3.DE`, `DNP.WA`).
