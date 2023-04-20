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

# Code review for data in dbt

PipeRider automatically compares your data to highlight the difference in impacted downstream dbt models so you can merge your Pull Requests with confidence.

### How it works:

- Easy to connect your datasource -> PipeRider leverages the [connection profiles in your dbt project](https://docs.getdbt.com/docs/get-started/connection-profiles) to connect to the data warehouse
- Generate profiling statistics of your models to get a high-level overview of your data
- Compare target branch changes with the main branch in a HTML report
- Post a quick summary of the data changes to your PR, so others can be confident too

### Core concepts

- **Easy to install**: Leveraging dbt's configuration settings, PipeRider can be installed within 2 minutes
- **Fast comparison**: by collecting profiling statistics (e.g. uniqueness, averages, quantiles, histogram) and metric queries, comparing downstream data impact takes little time, speeding up your team's review time
- **Valuable insights**: various profiling statistics displayed in the HTML report give fast insights into your data

# Quickstart

1. **Install PipeRider**

   ```bash
   pip install piperider[<connector>]
   ```

   PipeRider supports the following data connectors

   | connectors | install                              |
   | ---------- | ------------------------------------ |
   | snowflake  | `pip install 'piperider[snowflake]'` |
   | postgres   | `pip install 'piperider[postgres]'`  |
   | bigquery   | `pip install 'piperider[bigquery]'`  |
   | redshift   | `pip install 'piperider[redshift]'`  |
   | athena     | `pip install 'piperider[athena]'`    |
   | parquet    | `pip install 'piperider[parquet]'`   |
   | csv        | `pip install 'piperider[csv]'`       |
   | duckdb     | `pip install 'piperider[duckdb]'`    |

1. **Initialize PipeRider**: Go to your dbt project, and initialize PipeRider.

   ```bash
   piperider init
   ```

1. **Apply PipeRider tag**: [Apply `piperider` tag to the models](https://docs.getdbt.com/reference/resource-configs/tags) you want to profile

1. **Run PipeRider**: Collect profiling statistics by using

   ```
   dbt build
   piperider run
   ```

1. **Compare your changes**: You then can compare the branch of your new Pull Request against the main branch and explore the impact of your changes by opening the generated HTML comparison report

   ```bash
   git switch feature/pr-branch
   dbt build
   piperider run
   piperider compare-reports --last
   ```

1. **Post the markdown summary on the PR**: You can post the markdown summary of the data changes to your Pull Request comment, so that your reviewer can merge with confidence.

# Features

- Use PipeRider for exploratory data analysis by doing `piperider run` to view the profiling statistics of a single data source, even in an environment that doesn't use dbt
- Leverage dbt-defined `metrics` to have a quick overview of the impact on your most important metrics
- Include PipeRider into your CI process via PipeRider Cloud or self-hosted to be confident of every PRs that is submitted
- Benefit from dbt's features such as Slim CI, custom schema, custom database, [node selection](https://docs.getdbt.com/reference/node-selection/syntax), [dbt test result](https://docs.getdbt.com/docs/build/tests)

# Example Report Demo

We use the example project [git-repo-analytics](https://github.com/InfuseAI/git-repo-analytics) to demonstrate how to use piperider+dbt+duckdb to analyze [dbt-core](https://github.com/dbt-labs/dbt-core) repository. Here is the generated result (daily update)

[Run Report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/single-run-report/index.html)

[Comparison Report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/comparison-report/index.html)

[Comparison Summary in a PR](https://github.com/InfuseAI/git-repo-analytics/pull/19)

# PipeRider Cloud (beta)

PipeRider Cloud offers a hosted version for HTML reports, including features such as alerts and historical trend watching. Get early beta access by signing up on our website: https://piperider.io

# Development

See [setup dev environment](DEVELOP.md) and the [contributing guildlines](CONTRIBUTING.md) to get started.

**We love chatting with our users! [Let us know](mailto:product@infuseai.io) if you have any questions, feedback, or need help trying out PipeRider! :heart:**
