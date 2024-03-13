[![ci-tests](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)
[![codecov](https://codecov.io/gh/InfuseAI/piperider/branch/main/graph/badge.svg?token=iVbQKGM1JA)](https://codecov.io/gh/InfuseAI/piperider)
[![release](https://img.shields.io/github/release/infuseAI/piperider-cli/all.svg?style=flat-square)](https://github.com/infuseAI/piperider-cli/releases)
[![pipy](https://img.shields.io/pypi/v/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![python](https://img.shields.io/pypi/pyversions/piperider?style=flat-square)](https://pypi.org/project/piperider/)
[![downloads](https://img.shields.io/pypi/dw/piperider?style=flat-square)](https://pypi.org/project/piperider/#files)
[![license](https://img.shields.io/github/license/infuseai/piperider?style=flat-square)](https://github.com/InfuseAI/piperider/blob/main/LICENSE)
[![InfuseAI Discord Invite](https://img.shields.io/discord/664381609771925514?color=%237289DA&label=chat&logo=discord&logoColor=white&style=flat-square)](https://discord.com/invite/5zb2aK9KBV)

<p align="left">
  <a href="https://docs.piperider.io/" alt="documentation site" title="Piperider Documentation"> Docs </a> |
  <a href="https://discord.com/invite/5zb2aK9KBV"> Discord </a> |
  <a href="https://blog.infuseai.io/data-reliability-automated-with-piperider-7a823521ef11"> Blog </a> 
</p>

> \[!IMPORTANT\]
> PipeRider has been superseded by [Recce](https://datarecce.io). We recommend that users requiring pre-merge data validation checks migrate to Recce. PipeRider will not longer be updated on a regular basis. You are still welcome to open a PR with bug fixes or feature requests. For questions and help regarding this update, please contact [product@piperider.io](mailto:product@infuseai.io) or leave a message in the [Recce Discord](https://discord.gg/VpwXRC34jz).

# Code review for data in dbt

PipeRider automatically compares your data to highlight the difference in impacted downstream dbt models so you can
merge your Pull Requests with confidence.

### How it works:

- Easy to connect your datasource -> PipeRider leverages
  the [connection profiles in your dbt project](https://docs.getdbt.com/docs/get-started/connection-profiles) to connect
  to the data warehouse
- Generate profiling statistics of your models to get a high-level overview of your data
- Compare target branch changes with the main branch in a HTML report
- Post a quick summary of the data changes to your PR, so others can be confident too

### Core concepts

- **Easy to install**: Leveraging dbt's configuration settings, PipeRider can be installed within 2 minutes
- **Fast comparison**: by collecting profiling statistics (e.g. uniqueness, averages, quantiles, histogram) and metric
  queries, comparing downstream data impact takes little time, speeding up your team's review time
- **Valuable insights**: various profiling statistics displayed in the HTML report give fast insights into your data

# Quickstart

1. **Install PipeRider**

   ```bash
   pip install piperider[<connector>]
   ```

   You can find all supported data source connectors [here](https://docs.piperider.io/reference/supported-data-sources).

1. **Add PipeRider tag on your model**: Go to your dbt project, and add the PipeRider tag on the model you want to
   profile.

   ```sql
   --models/staging/stg_customers.sql
   {{ config(
      tags=["piperider"]
   ) }}

   select ...
   ```

   and show the models would be run by piperider

   ```
    dbt list -s tag:piperider --resource-type model
   ```

1. **Run PipeRider**

   ```bash
   piperider run
   ```

To see the full quick start guide, please refer
to [PipeRider documentation](https://docs.piperider.io/get-started/quick-start)

# Features

- **Model profiling**: PipeRider can profile your [dbt models](https://docs.getdbt.com/docs/build/models) and obtain
  information such as basic data composition, quantiles, histograms, text length, top categories, and more.
- **Metric queries**: PipeRider can integrate with [dbt metrics](https://docs.getdbt.com/docs/build/metrics) and present
  the time-series data of metrics in the report.
- **HTML report**: PipeRider generates a static HTML report each time it runs, which can be viewed locally or shared.
- **Report comparison**: You can compare two previously generated reports or use a single command to compare the
  differences between the current branch and the main branch. The latter is designed specifically for code review
  scenarios. In our pull requests on GitHub, we not only want to know which files have been changed, but also the impact
  of these changes on the data. PipeRider can easily generate comparison reports with a single command to provide this
  information.
- **CI integration**: The key to CI is automation, and in the code review process, automating this workflow is even more
  meaningful. PipeRider can easily integrate into your CI process. When new commits are pushed to your PR branch,
  reports can be automatically generated to provide reviewers with more confidence in the changes made when reviewing.

# Example Report Demo

We use the example project [git-repo-analytics](https://github.com/InfuseAI/git-repo-analytics) to demonstrate how to
use piperider+dbt+duckdb to analyze [dbt-core](https://github.com/dbt-labs/dbt-core) repository. Here is the generated
result (daily update)

[Run Report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/single-run-report/index.html)

[Comparison Report](https://piperider-github-readme.s3.ap-northeast-1.amazonaws.com/comparison-report/index.html)

[Comparison Summary in a PR](https://github.com/InfuseAI/git-repo-analytics/pull/19)

# PipeRider Cloud (beta)

[PipeRider Cloud](http://cloud.piperider.io/) allows you to upload reports and share them with your team members. For
information on pricing plans, please refer to the [pricing page](https://www.piperider.io/#pricing).

# PipeRider Compare Action

PipeRider provides the [PipeRider Compare Action](https://github.com/marketplace/actions/piperider-compare-action) to
quickly integrate into your Github Actions workflow. It has the following features:

- Automatically generates a report comparing the PR branch to the main branch
- Uploads the report to GitHub artifacts or PipeRider cloud
- Adds a comment to the pull request with a comparison summary and a link to the report.

You can refer to
example [workflow yaml](https://github.com/InfuseAI/jaffle_shop/blob/main/.github/workflows/pr-compare.yml) and
the [example pull request](https://github.com/InfuseAI/jaffle_shop/pull/19).

# Development

See [setup dev environment](DEVELOP.md) and the [contributing guildlines](CONTRIBUTING.md) to get started.

**We love chatting with our users! [Let us know](mailto:product@infuseai.io) if you have any questions, feedback, or
need help trying out PipeRider! :heart:**
