<p>
  <a href="https://piperider.io" alt="piperider logo" title="Piperider Home">
    <img width="450px" src=".github/images/logo.svg" border="0" alt="PipeRider">
  </a>
</p>
<p>
  Data reliability tool for profiling and testing your data
</p>

[![ci-tests](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)
[![release](https://img.shields.io/github/release/infuseAI/piperider-cli/all.svg?style=flat-square)](https://github.com/infuseAI/piperider-cli/releases)
[![pipy](https://img.shields.io/pypi/v/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![python](https://img.shields.io/pypi/pyversions/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![downloads](https://img.shields.io/pypi/dw/piperider?style=flat-square)](https://pypi.org/project/piperider/#files)
[![license](https://img.shields.io/github/license/infuseai/piperider?style=flat-square)](https://github.com/InfuseAI/piperider/blob/main/LICENSE)
[![InfuseAI Discord Invite](https://img.shields.io/discord/664381609771925514?color=%237289DA&label=chat&logo=discord&logoColor=white&style=flat-square)](https://discord.com/invite/5zb2aK9KBV)

<p align="left">
  <a href="https://docs.piperider.io/" alt="documentation site" title="Piperider Documentation"> Docs </a> |
  <a href="https://github.com/orgs/InfuseAI/projects/1/views/1" alt="product roadmap" title="Planned Features/Changes"> Roadmap </a> |
  <a href="https://discord.com/invite/5zb2aK9KBV"> Discord </a> |
  <a href="https://blog.infuseai.io/data-reliability-automated-with-piperider-7a823521ef11"> Blog </a> 
</p>

# Data Reliability = Profiling + Testing

Piperider is a CLI tool that allows you to build data profiles and write assertion tests for easily evaluating and tracking your data's reliability over time.

## Core Concepts

1. **Profile Your Data** to explore/understand what kind of dataset you're dealing with
   _e.g. completeness, duplicates, missing values, distributions_
2. **Test Your Data** to verify that your data is within acceptable range and formatted correctly
3. **Observe & Monitor Your Data** to keep an eye on how that data changes over time

## Key Features

- **SQL-based** (additionally supports CSV)
- **Data Profiling Characteristics**
  - Provides rich data profiling [metrics](https://github.com/InfuseAI/piperider/blob/main/docs/metrics.md)
  - e.g. `missing`, `uniqueness`, `duplicate_rows`, `quantiles`, `histogram`
- **Test datasets with a mix of custom and built-in assertion definitions**
- **Auto-generates recommended assertions based on your single-run profiles**
- **Generates single-run reports** to visualize your data profile and assertion test results ([example](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.17.0/index.html))
- **Generates comparison reports** to visualize how your data has changed over time ([example](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/comparison-0.17.0/index.html))
- **Supported Datasources**: Snowflake, BigQuery, Redshift, Postgres, SQLite, DuckDB, CSV, Parquet.

# Quickstart

## Installation

```bash
pip install piperider
```

By default, PipeRider supports built-in SQLite connector, extra connectors are available:

| connectors | install                              |
| ---------- | ------------------------------------ |
| snowflake  | `pip install 'piperider[snowflake]'` |
| postgres   | `pip install 'piperider[postgres]'`  |
| bigquery   | `pip install 'piperider[bigquery]'`  |
| redshift   | `pip install 'piperider[redshift]'`  |
| parquet    | `pip install 'piperider[parquet]'`   |
| csv        | `pip install 'piperider[csv]'`       |
| duckdb     | `pip install 'piperider[duckdb]'`    |

Use comma to install multiple connectors in one line:

```bash
pip install 'piperider[postgres,snowflake]'
```

## Initialize Project & Diagnose Settings

Once installed, initialize a new project with the following command.

```bash
piperider init        # initializes project config
piperider diagnose    # verifies your data source connection & project config
```

## Profiling and Testing Your Data

Next, execute `piperider run`, which will do a number of things:

1. Create a single-run profile of your data source
1. Auto-generate recommended or template assertions files (first-run only)
1. Test that single-run profile against any available assertions, including custom and/or recommended assertions
1. Generate a static HTML report, which helps visualize the single-run profile and its assertion results.

Common Usages/Tips:

```bash
piperider run                           # profile all tables in the data source.

piperider run --table $TABLENAME        # profile a specific table

piperider generate-report -o $PATHNAME  # Specify the output location of the generated report

piperider generate-assertions           # To re-generate the recommended assertions after the first-run
```

## Comparing Your Data Profiles

With at least two runs completed, you can then run `piperider compare-reports`, which will generate a comparison report that presents the changes between them (e.g. schema changes, column renaming, distributions).

Common Usages/Tips:

```bash
piperider compare-reports --last        # Compare the last two reports automatically using
```

For more details on the generated report, see the [doc](https://docs.piperider.io/how-to-guides/generate-report)

## Example Report Demo

[See Generated Single-Run Report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.17.0/index.html)

[See Comparison Report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/comparison-0.17.0/index.html)

# Development

See [setup dev environment](DEVELOP.md) and the [contributing guildlines](CONTRIBUTING.md) to get started.

**We're in an early stage, so [let us know](mailto:product@infuseai.io) if you have any questions, feedback, or need help trying out PipeRider! :heart:**
