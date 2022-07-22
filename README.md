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

[PipeRider](https://www.piperider.io/) ensures data reliability through automating constant data testing and monitoring.

Key Features:

- Instant quality assessment in HTML report: [sample report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/single-run/global_mobility_report.html)
- Report comparison: [sample comparsion report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/compare-report/index.html)
- [Extensible custom assertions](https://docs.piperider.io/data-quality-assertions/custom-assertions)
- Works with existing [dbt](https://github.com/dbt-labs/dbt-core) projects
- Automatic test recommendations

[Read more](https://blog.infuseai.io/data-reliability-automated-with-piperider-7a823521ef11) about why we created PipeRider.

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

You can follow the [quick start guide](https://docs.piperider.io/quick-start) to learn more about PipeRider.


## Attach PipeRider to a dbt project

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

[Documentation]: https://docs.piperider.io/
[Sample_Project]: https://github.com/InfuseAI/infuse-finance
[dbt_Sample_Project]: https://github.com/InfuseAI/dbt-infuse-finance
[Roadmap]: https://github.com/orgs/InfuseAI/projects/1/views/1


# Get involved
## Contributions

We welcome contributions. See the [Set up dev environment](DEVELOP.md) and the [Contributing guildline](CONTRIBUTING.md) to get started.
