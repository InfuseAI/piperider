# PipeRider Report

## Installation

```sh
$ npm install
```

## Development

### Generate reports with the local CLI (Prerequisite)

To develop the CLI alongside FE static reports.
This is REQUIRED for serving your apps, as it depends on the outputs:

1. Go to the root of this repo
1. Initialize Python's Virtual Environment: `python -m venv .venv`
1. Activate the Virtual Environment: `source .venv/bin/activate`
1. Install Python packages: run `pip install -r requirements.txt` (now you are running the CLI from the python source code)
1. Add a local data source (see [this quickstart step](https://docs.piperider.io/quick-start#prepare-sqlite-database))
1. Run `piperider init` (creates `.piperider/` dir)
1. Generate your Single and Comparison reports (`piperider run` for single; `piperider compare-reports` for comparison)

All `start:*` scripts will run correspondingly to `prestart:*` to setup your development environment.
The prestart scripts will do the following, sourcing from the project's root `.piperider/`, created by `piperider init`:

1. Get the latest schema of report/comparison from raw data
1. Get the latest report/comparison TS typings from generated schema
1. Embed the latest available report/comparison raw data into index.html

> **Note**
>
> If you need to make changes to above behaviors, see the `package.json` and/or the `utils/*.js` scripts to modify.

### Single Report

```sh
$ npm run start # make dev
```

Open `http://localhost:3000` in your browser.

### Comparsion Report

```sh
$ npm run start:compare # make dev-compare
```

Open `http://localhost:3001` in your browser.

## Build

> **Note**
>
> Generated **single report** and **comparison report** will place into [piperider_cli/data/report](https://github.com/InfuseAI/piperider/tree/main/piperider_cli/data/report).

You can use npm scripts, or use `make` commands.

### Single Report

```sh
$ make build-single
```

### Comparsion Report

```sh
$ make build-comparison
```

### Build Single & Comparison Reports

```sh
$ make build
```
