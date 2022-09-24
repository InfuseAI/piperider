# PipeRider: Data Reliability Toolkit

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
**[PipeRider](https://www.piperider.io/)** is a light-weight data reliability toolkit using warehouse-native profiling so you can have a full understanding of your data 

**We're in an early stage, so [let us know](mailto:product@infuseai.io) if you have any questions, feedback, or need help installing PipeRider! :heart:**



## Profiling as a data reliability strategy
PipeRider will make your life easier by:
1. Building a data profile so you can easily understand your data
2. Creating test suggestions based on the profiling
3. Comparing data profile reports, so you track changes over time

[Read how to implement a data quality strategy using profiling + testing](https://blog.infuseai.io/add-data-profiling-and-assertions-to-dbt-with-piperider-732ca0821e3a)



## Made for the modern data team
**For data engineers**
* :zap: 2 min install & set-up
* :relieved: Non-intrusive & open-source: install and use locally
* :money_with_wings: Fast & cheap: 100M rows & 8 columns (or 50M & 16 columns) takes only 18s to profile
* :ledger: Cloud DataWarehouse native & auto-config for dbt



**For data analysts**
* :bowtie: Never waste time on analyzing wrong data: collects various metadata metrics such as freshness, uniqueness, distribution... [check all metrics](https://docs.piperider.io/data-profile-and-metrics/metrics)
* :speech_balloon: Communicate easily your data expectations by showing the report
* Zero-config dbt integration


## Live Demo
[![](https://i.imgur.com/WuFC4H6.png)](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.7.0/index.html)

[Click here or on image to interact](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.7.0/index.html)

<!-- # Table of contents
* [What's PipeRider?](#what's-piperider?)
    * [Made for...](#made-for...)
    * [Live demo](#live-demo)
* [Table of contents](#table-of-contents)
* [Getting started](#getting-started)
    * [Install piperider](#install-piperider)
    * [Attach PipeRider to a dbt project](#attach-piperider-to-a-dbt-project)
    * [Scan data quality from models](#scan-data-quality-from-models)
    * [Generate reports](#generate-reports)
    * [Generate comparison view](#generate-comparison-view)
* [Learn more](#learn-more)
* [Get involved](#get-involved)
    * [Support](#support)
    * [Contributions](#contributions)
 -->


## Key features
* [Generate an HTML Report](https://docs.piperider.io/how-to-guides/generate-report) featuring your data profile and data assertion test results ([interactive sample](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/run-0.9.0/index.html))
* [Compare two reports](https://docs.piperider.io/how-to-guides/compare-reports) to understand how your data has changed over time ([interactive sample](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/comparison-0.9.0/index.html))
* Test your data with data assertions:
  * Built-in [data assertions](https://docs.piperider.io/data-quality-assertions/assertion-configuration)
  * Extensible through [custom assertions](https://docs.piperider.io/data-quality-assertions/custom-assertions)
  * Auto-generated data assertions
* [Support various data sources](https://docs.piperider.io/data-sources/supported-data-sources) like Snowflake, BigQuery, Redshift, Postgres, SQLite, DuckDB, CSV, Parquet and more.
* Zero-config [support for dbt](https://docs.piperider.io/dbt-integration/) projects
* Automation through [GitHub Actions](https://docs.piperider.io/how-to-guides/github-action/), [save reports in S3](https://docs.piperider.io/how-to-guides/aws-s3-+-github-ci/)




# Getting started

Get started quickly below, go to [the docs](https://docs.piperider.io/), or check out this article on [how to add data observability using PipeRider ](https://blog.infuseai.io/adding-data-observability-and-alerts-to-your-data-pipeline-is-easier-than-you-think-4e005daca55b)

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
Initialize PipeRider inside a dbt project and your data source settings will be automatically configured

`piperider init` creates `/.piperider` under a dbt project root and generates necessary configurations.

![piperider_init](images/init_pipe.gif)

## Scan data quality from models

`piperider run` scans the models from data sources and creates assessment results in `/.piperider/output`

![piperider_run](images/run_pipe.gif)

## Generate reports

`piperider generate-report` generate a static HTML report.

![piperider_report](images/report_pipe.gif)

## Generate comparison view

You can use `piperider compare-report` to compare 2 reports.

![piperider_compare](images/compare_pipe.gif)

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

## Support 
If you like what we are building, support us! Give us a :star: or get in touch. We'd love your feedback! Send us a message on [piperider.io](https://piperider.io), join our [Discord](https://discord.com/invite/CrAxQznedH), or report an issue on [GitHub](https://github.com/InfuseAI/piperider/issues)


## Contributions

We welcome contributions. See the [Set up dev environment](DEVELOP.md) and the [Contributing guildline](CONTRIBUTING.md) to get started.
