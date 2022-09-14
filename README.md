# PipeRider: Data Reliability Automated

[![ci-tests](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)
[![release](https://img.shields.io/github/release/infuseAI/piperider-cli/all.svg?style=flat-square)](https://github.com/infuseAI/piperider-cli/releases)
[![pipy](https://img.shields.io/pypi/v/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![python](https://img.shields.io/pypi/pyversions/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![downloads](https://img.shields.io/pypi/dw/piperider?style=flat-square)](https://pypi.org/project/piperider/#files)
[![license](https://img.shields.io/github/license/infuseai/piperider?style=flat-square)](https://github.com/InfuseAI/piperider/blob/main/LICENSE)
[![InfuseAI Discord Invite](https://img.shields.io/discord/664381609771925514?color=%237289DA&label=chat&logo=discord&logoColor=white&style=flat-square)](https://discord.com/invite/5zb2aK9KBV)

<p align="center">
  <a href="https://piperider.io">
    <img  src=".github/images/logo.svg" border="0" alt="PipeRider">
  </a>
</p>


# What's PipeRider?
[PipeRider](https://www.piperider.io/) is a light-weight data quality tool so you can be confident of your data without writing tests for every single pipeline. 

**We're in an early stage, so [let us know](mailto:product@infuseai.io) if you have any questions, feedback, or need help installing PipeRider! :heart:**


## Key Features
* [Generate an HTML Report](https://docs.piperider.io/how-to-guides/generate-report) featuring your data profile and data assertion test results ([interactive sample](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.8.0/index.html))
* [Compare two reports](https://docs.piperider.io/how-to-guides/compare-reports) to understand how your data has changed over time ([interactive sample](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/comparison-0.8.0/index.html))
* Test your data with data assertions:
  * Built-in [data assertions](https://docs.piperider.io/data-quality-assertions/assertion-configuration)
  * Extensible through [custom assertions](https://docs.piperider.io/data-quality-assertions/custom-assertions)
  * Auto-generated data assertions
* Currently supports [Postgres](https://docs.piperider.io/data-sources/postgres-connector), [Snowflake](https://docs.piperider.io/data-sources/snowflake-connector), SQLite, [BigQuery](https://docs.piperider.io/data-sources/bigquery-connector), [Redshift](https://docs.piperider.io/data-sources/redshift-connector), [DuckDB](https://docs.piperider.io/data-sources/duckdb-connector/), [CSV](https://docs.piperider.io/data-sources/csv-connector/) and [Parquet](https://docs.piperider.io/data-sources/parquet-connector/).
* Zero-config [support for dbt](https://docs.piperider.io/dbt-integration/) projects
* Automation through [GitHub Actions](https://docs.piperider.io/how-to-guides/github-action/), [save reports in S3](https://docs.piperider.io/how-to-guides/aws-s3-+-github-ci/)

## Made for...
**For data engineers**
* :zap: 2 min install & set-up
* :relieved: non-intrusive & open-source: install and use locally
* :moneybag: fast & cheap: 10M rows, 8 columns takes only 16s to profile


**For data analysts**
* :bowtie: never waste time on analyzing wrong data: collects various metadata metrics such as freshness, uniqueness, distribution... [check all metrics](https://docs.piperider.io/data-profile-and-metrics/metrics)
* :speech_balloon: communicate easily your data expectations by showing the report


## Live Demo
[![](https://i.imgur.com/WuFC4H6.png)](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.8.0/index.html)

[Click here or on image to interact](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.8.0/index.html)

# Getting started

Get started quickly below, or go to [the docs](https://docs.piperider.io/)

## Install PipeRider

```bash
pip install piperider
```

By default, PipeRider supports built-in SQLite connector, extra connectors are available:

| connectors  | install  | supported since  |
|---|---|------------------|
| snowflake | pip install 'piperider[snowflake]'  |                  |
| postgres  | pip install 'piperider[postgres]'  |                  |
| bigquery | pip install 'piperider[bigquery]'  | PipeRider v0.7.0 |
| redshift | pip install 'piperider[redshift]'  | PipeRider v0.7.0 |
| parquet | pip install 'piperider[parquet]' | PipeRider v0.8.0 |
| csv | pip install 'piperider[csv]' | PipeRider v0.8.0 |
| duckdb | pip install 'piperider[duckdb]' | PipeRider v0.8.0 |

Use comma to install multiple connectors in one line:

```bash
pip install 'piperider[postgres,snowflake]'
```

You can follow the [quick start guide](https://docs.piperider.io/quick-start) to learn more about PipeRider.

## Attach PipeRider to a dbt project

`piperider init` creates `/.piperider` under a dbt project root and generates necessary configurations.

## Scan data quality from models

`piperider run` runs profiling, and tests against assertions, and will render an HTML report `/.piperider/outputs`

You can do a run for a specific table using `piperider run --table $TABLENAME`
You can specifying the output location of a report using `piperider generate-report -o $PATHNAME` or specifying it in the config file.

[All details on generating reports](https://docs.piperider.io/how-to-guides/generate-report)

## Generate comparison view

You can use `piperider compare-report` to compare 2 reports.


# Learn More

| PipeRider Resources | Description |
| -------------------- | ----------- |
| [Documentation] | PipeRider Main Doc Site |
| [Sample_Project] | Sample Project with with sqlite |
| [dbt_Sample_Project] | Sample Project with dbt |
| [Roadmap] | PipeRider Roadmap |
| [Blog] | How we got started |


[Documentation]: https://docs.piperider.io/

[Sample_Project]: https://github.com/InfuseAI/infuse-finance

[dbt_Sample_Project]: https://github.com/InfuseAI/dbt-infuse-finance

[Roadmap]: https://github.com/orgs/InfuseAI/projects/1/views/1

[Blog]: https://blog.infuseai.io/data-reliability-automated-with-piperider-7a823521ef11

# Get involved

## Support :heart:
If you like what we are building, support us! Give us a :star: or get in touch. We'd love your feedback! Send us a message on [piperider.io](https://piperider.io), join our [Discord](https://discord.com/invite/CrAxQznedH), or report an issue on [GitHub](https://github.com/InfuseAI/piperider/issues)


## Contributions

We welcome contributions. See the [Set up dev environment](DEVELOP.md) and the [Contributing guildline](CONTRIBUTING.md) to get started.
