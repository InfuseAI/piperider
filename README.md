# PipeRider

For data practitioner who wants to trust their data by:

- Defining the shape of data, so they can **make sure the data will be expected in the future**
- Save time on debugging data,**easily discover & discuss any data problems from upstream**
- Socially **collaborate across teams on the dataset through data catalog and data insights**

# Install

```bash
$ pip install piperider
```

### Install with connectors

By default, we support the built-in sqlite connector, there are extra connectors:

* snowflake
* postgres

Install with postgres connector:

```
pip install piperider[postgres]
```

It could be more than one connector with comma:

```
pip install piperider[postgres,snowflake]
```

# Command

## Attach piperider to a dbt project

```bash
$ piperider init
```

This command creates `/.piperider` under a dbt project root and generate necessary configurations.

## Scan models

```bash
$ piperider run
```

This command scans the models from datasource and create assessment results in `/.piperider/output`

## Generate reports

```bash
$ piperider generate-report <piperider result file>
```

generate a static html report under current path. 
