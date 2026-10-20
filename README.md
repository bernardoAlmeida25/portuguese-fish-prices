# Portuguese Fish Prices

A small open-data project that collects fish prices in Portugal and makes them available through a simple website. The goal is to build a daily historical dataset so prices can be explored by date instead of only seeing the latest collection.

## What it does

- Collects fish price data using a Python scraper.
- Stores the collected data in a JSON file that can be consumed by the website.
- Keeps historical daily records as new data is collected.
- Provides a website with date selection and price visualisations.
- Uses GitHub Actions to automate data collection and website deployment.
- Publishes the website with GitHub Pages.

## Website

Once GitHub Pages is configured, the website URL will be available in the repository's **Settings → Pages** section.

## Data

The website reads its data from `data/fish_prices.json`.

The JSON contains the collected price records, including the date and the available fish/market details returned by the source. The exact fields depend on the source data collected by the scraper.

Only collected data should be displayed. If the JSON cannot be loaded, the website should show an error rather than substitute sample or fictional prices.

### Historical data

The historical series starts when data collection is first run and successfully persisted. Earlier dates cannot be reconstructed unless an existing archive or another historical source is available.

The collection workflow must preserve the existing dataset between runs before adding or updating records. GitHub Actions jobs use fresh runners, so a local file must be committed, downloaded from a persistent artifact/storage location, or otherwise restored before the scraper updates it.

## Project structure

```text
.
├── .github/
│   └── workflows/
│       ├── collect-prices.yml
│       └── deploy-pages.yml
├── data/
│   └── fish_prices.json
├── scripts/
│   └── fish_prices.py
├── index.html
├── pyproject.toml
├── uv.lock
├── .python-version
├── .gitignore
├── LICENSE
└── README.md
```

The paths above describe the intended layout; adjust them if the repository uses a different structure.

## Automated updates

The data collection workflow is intended to run daily at 21:00 in Portugal. GitHub Actions schedules use UTC, so the cron expression must account for Portugal's daylight-saving changes if the workflow is expected to run at exactly 21:00 local time throughout the year.

The deployment workflow publishes the website using GitHub Pages after the site files and data are available.

## Run locally

Requirements: the Python version specified in `.python-version` and [uv](https://docs.astral.sh/uv/).

Install the project dependencies with:

```bash
uv sync
```

Run the scraper with:

```bash
uv run scripts/fish_prices.py
```

Run these commands from the repository root. Adjust the script path if the project keeps `fish_prices.py` somewhere else.

To preview the website locally, serve the repository root with a local HTTP server rather than opening `index.html` directly:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

## Data use and limitations

- Prices represent the records collected from the source and may not represent every market or transaction.
- Missing dates mean that no data is available for those dates; they should not be interpreted as zero prices.
- Historical comparisons, including seasonal comparisons such as Santos Populares, should only be shown when there is sufficient real data for the periods being compared.
- The accuracy and coverage of the dataset depend on the source and the scraper.

## Contributing

Suggestions and bug reports are welcome. When reporting an issue, include the date affected and a description of the problem. Do not include credentials, tokens, or other secrets in issues or commits.

## License

The code is licensed under the [MIT License](LICENSE).