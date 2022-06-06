
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

# Key Features
## Generate quality assessment in html
![single_run_view](/images/piperider_single_run.png)

## Inject tests to key metrics
Refer to [User defined test functions](https://github.com/InfuseAI/piperider-cli/blob/main/docs/user-defined-test-function.md)

## Compare different test runs
![comparison_view](/images/piperider_comparison_view.png)

# Quick start
## Install PipeRider

```bash
$ pip install piperider-cli
```
## Attach piperider to a dbt project
```bash
$ piperider-cli init
```
This command creates `/.piperider` under a dbt project root and generate necessary configurations.

## Scan data quality from models
```bash
$ piperider-cli run
───── Summary ─────
Table 'PUBLIC.PRICE_LATEST'
  11 columns profiled

Table 'PUBLIC.ACTION'
  4 columns profiled

Table 'PUBLIC.SYMBOL'
  11 columns profiled

Table 'PUBLIC.PRICE'
  11 columns profiled

Results saved to .piperider/outputs/infuse_finance-20220606094031
```
This command scans the models from datasource and create assessment results in `/.piperider/output`

## Generate reports
```bash
$ piperider-cli generate-report
───── Summary ─────
Table 'PUBLIC.SYMBOL'       .piperider/reports/infuse_finance-20220606094618/PUBLIC.SYMBOL.html
Table 'PUBLIC.ACTION'       .piperider/reports/infuse_finance-20220606094618/PUBLIC.ACTION.html
Table 'PUBLIC.PRICE'        .piperider/reports/infuse_finance-20220606094618/PUBLIC.PRICE.html
Table 'PUBLIC.PRICE_LATEST' .piperider/reports/infuse_finance-20220606094618/PUBLIC.PRICE_LATEST.html
```
generate a static html report under current path. 

## Generate comparison view
```bash
$ piperider-cli compare-report
[?] Please select the 2 reports to compare:
 > o infuse_finance->PUBLIC.SYMBOL        #pass=0 #fail=0 #row=505      #column=11  2022-06-02T16:27:54.115939Z
   o infuse_finance->PUBLIC.ACTION        #pass=0 #fail=0 #row=18156    #column=4   2022-06-02T16:27:54.115939Z
   o infuse_finance->PUBLIC.PRICE         #pass=0 #fail=0 #row=1492460  #column=11  2022-06-02T16:27:54.115939Z
   o infuse_finance->PUBLIC.PRICE_LATEST  #pass=0 #fail=0 #row=505      #column=11  2022-06-02T16:27:54.115939Z
   o infuse_finance->PUBLIC.SYMBOL        #pass=0 #fail=0 #row=505      #column=11  2022-06-02T15:46:24.464595Z
   o infuse_finance->PUBLIC.ACTION        #pass=0 #fail=0 #row=18156    #column=4   2022-06-02T15:46:24.464595Z
   o infuse_finance->PUBLIC.PRICE         #pass=0 #fail=0 #row=1492460  #column=11  2022-06-02T15:46:24.464595Z
   o infuse_finance->PUBLIC.PRICE_LATEST  #pass=0 #fail=0 #row=505      #column=11  2022-06-02T15:46:24.464595Z
```
