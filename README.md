# Portfolio Fundamentals Web App

A ready-to-run web app that shows 10-year annual business fundamentals for your portfolio companies.

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
This app now fetches statement time-series from Yahoo Finance through the local backend (`/api/financials/:ticker`).

## Run
```bash
python server.py
```
Then open http://localhost:8000.

## Why this fixes your 403
- No Financial Modeling Prep key is needed anymore.
- The dashboard avoids FMP 403/plan/key issues by using the backend Yahoo fetch route.

## Notes
- Some non-US listings can have partial fundamentals in Yahoo.
- If a metric is unavailable for a year, the bar appears empty.
