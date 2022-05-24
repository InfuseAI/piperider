# PipeRider

For data practitioner who wants to trust their data by:  
- Defining the shape of data, so they can **make sure the data will be expected in the future** 
- Save time on debugging data,**easily discover & discuss any data problems from upstream**
- Socially **collaborate across teams on the dataset through data catalog and data insights**

# Install

```bash
$ pip install git+https://github.com/InfuseAI/piperider-cli.git@main
```

# Command

## Attach piperider to a dbt project
```bash
$ piperider-cli init
```
This command creates `/.piperider` under a dbt project root and generate necessary configurations.


## Scan models
```bash
$ piperider-cli run
```
This command scans the models from datasource and create assessment results in `/.piperider/output`

## Generate reports
```bash
$ piperider-cli generate-report <piperider result file>
```
generate a static html report under current path. 
