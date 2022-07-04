
<p align="center">
  <a href="https://piperider.io">
    <img  src=".github/images/logo.svg"
      width="284" border="0" alt="PipeRider">
  </a>
</p>

# PipeRider: Data Reliability Automated

# What is PipeRider?

PipeRider is an open-source toolkit for detecting data issues across pipelines that work with CI systems for continuous data quality assessment. PipeRider makes it easy for teams to have visibility about how data are being tested, and ensure errors are caught before they cause outages of downstream data applications like business intelligence dashboards or ML systems.
# Why PipeRider?

Ensuring consistent quality of data used to be difficult. Missing values, schema changes and data drift (to name just a few) could be introduced to your data at any time. Without effective data quality tools, these errors will affect downstream operations and result in countless lost hours of debugging and missed revenue opportunities from unexpected downtime.
PipeRider allows you to define the shape of your data once, and then use the data checking functionality to alert you to changes in your data quality.

[Read more](https://blog.infuseai.io/data-reliability-automated-with-piperider-7a823521ef11) about why we created PipeRider.

[![ci-tests](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)
[![release](https://img.shields.io/github/release/infuseAI/piperider-cli/all.svg?style=flat-square)](https://github.com/infuseAI/piperider-cli/releases)
[![pipy](https://img.shields.io/pypi/v/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![python](https://img.shields.io/pypi/pyversions/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![downloads](https://img.shields.io/pypi/dw/piperider?style=flat-square)](https://pypi.org/project/piperider/#files)
[![license](https://img.shields.io/github/license/infuseai/piperider?style=flat-square)](https://github.com/InfuseAI/piperider/blob/main/LICENSE)
[![InfuseAI Discord Invite](https://img.shields.io/discord/664381609771925514?color=%237289DA&label=chat&logo=discord&logoColor=white&style=flat-square)](https://discord.com/invite/5zb2aK9KBV)


# Learn More

| PipeRider Resources | Description |
| -------------------- | ----------- |
| [Documentation] | PipeRider Main Doc Site |
| [Sample_Project] | Sample Project with with sqlite |
| [dbt_Sample_Project] | Sample Project with dbt |
| [Roadmap] | PipeRider Roadmap |

[Documentation]: https://docs.piperider.io/
[Sample_Project]: https://github.com/InfuseAI/infuse-finance
[dbt_Sample_Project]: https://github.com/InfuseAI/dbt-infuse-finance
[Roadmap]: https://github.com/orgs/InfuseAI/projects/1/views/1


# Key Features

## Instant quality assessment in HTML report

Example of [single run report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/single-run/global_mobility_report.html)

## Report Comparison

Example of [comparison report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/compare-report/index.html)

## Extensible custom assertions

Refer
to [custom assertions](https://docs.piperider.io/data-quality-assertions/custom-assertions)
## Works with existing dbt projects

## Automatic Test Recommendations (Coming Soon)

# Getting started

## Install PipeRider

```bash
pip install piperider
```

By default, PipeRider supports built-in SQLite connector, extra connectors are available:

| connectors  | install  |
|---|---|
| snowflake | pip install 'piperider[snowflake]'  |
| postgres  | pip install 'piperider[postgres]'  |

Use comma to install multiple connectors in one line:

```bash
pip install 'piperider[postgres,snowflake]'
```

## Attach PipeRider to a dbt project

![piperider_init](images/init_pipe.gif)

This command creates `/.piperider` under a dbt project root and generates necessary configurations.

## Scan data quality from models

![piperider_run](images/run_pipe.gif)

This command scans the models from data sources and creates assessment results in `/.piperider/output`

## Generate reports

![piperider_report](images/report_pipe.gif)

generate a static HTML report under the current path.

## Generate comparison view

![piperider_compare](images/compare_pipe.gif)

The generated report in HTML will be placed in the path shown in the console.

# Get involved
## Contributions

We welcome contributions. See the [Set up dev environment](DEVELOP.md) and the [Contributing guildline](CONTRIBUTING.md) to get started.
