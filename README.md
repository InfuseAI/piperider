
<p align="center">
  <a href="https://piperider.io">
    <img  src="/.github/images/logo.svg"
      width="284" border="0" alt="PipeRider">
  </a>
</p>

[![ci-tests](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)](https://github.com/infuseai/piperider-cli/actions/workflows/tests.yaml/badge.svg)
[![release](https://img.shields.io/github/release/infuseAI/piperider-cli/all.svg?style=flat-square)](https://github.com/infuseAI/piperider-cli/releases)
[![InfuseAI Discord Invite](https://img.shields.io/discord/664381609771925514?color=%237289DA&label=chat&logo=discord&logoColor=white)](https://discord.com/invite/5zb2aK9KBV)

# Catch data problems where they start
For data practitioner who wants to trust their data by:  
- Defining the shape of data, so they can **make sure the data will be expected in the future** 
- Save time on debugging data,**easily discover & discuss any data problems from upstream**
- Socially **collaborate across teams on the dataset through data catalog and data insights**

# Generate quality assessment in html
## Data distribution
## Min/Max range
## Missing value

# Inject tests to key metrics
## Table wise
## Column wise

# Compare different test runs

# Install PipeRider

```bash
$ pip install piperider-cli
```

# Command

## Attach piperider to a dbt project
```bash
$ piperider-cli init
```
This command creates `/.piperider` under a dbt project root and generate necessary configurations.


## Scan data quality from models
```bash
$ piperider-cli run
```
This command scans the models from datasource and create assessment results in `/.piperider/output`

## Generate reports
```bash
$ piperider-cli generate-report <piperider result file>
```
generate a static html report under current path. 
