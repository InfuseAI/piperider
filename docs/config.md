# PipeRider Project Configuration


## Data Sources
A PipeRider project can contain a few data sources. PipeRider will help you finish these settings after initialization.

Multiple data sources are allowed and `piperider run` provides an options `--datasource` to specify which data source to profile.

| Field | Description |
| --- | --- |
| name | Name of data source |
| type | Type of the data source |
| dbpath *\** | Path of sqlite db |

*\* dbpath is only available for sqlite type data source*

Example
```
  dataSources:
  - name: my_data_source
    type: sqlite
    dbpath: ./data/my-sqlite.db
```

## Profiler
Profiler configurations are used to customize the behavior of PipeRider profiler.

- PipeRider provides the row-limited setting to help with profiling partial of a large dataset and gives you quick navigation.
- Duplicate row detection could be a time costing metric, you can enabled it depend on your dataset usage.

| Field | Type | Description | Default |
| --- | --- | --- | --- |
| limit | integer | the maximum row count to profile | unlimited |
| duplicateRows | boolean | enable duplicate rows metric | false |

Example
```
profiler:
  table:
    # the maximum row count to profile (Default unlimited)
    limit: 1000000
    duplicateRows: false
```

## Tables
Tables provide a structure to describe tables and columns in the data source.

| Field | Type | Description | Default |
| --- | --- | --- | --- |
| description | string | the maximum row count to profile | empty string |

Example
```
tables:
  my-table-name:
    # description of the table
    description: "this is a table description"
    columns:
      my-col-name:
        # description of the column
        description: "this is a column description"
```

## Inclusion/Exclusion
There would be plenty of tables in the data source. PipeRider provides a allowlist and a blocklist for your to specify which tables to profile.

PipeRider includes tables in the allowlist first then excludes tables in the blocklist.

| Field | Type | Description | Default |
| --- | --- | --- | --- |
| includes | array | list of tables allowing to profile | no tables are included |
| excludes | array | list of tables blocking to profile | no table are excluded |

*\* an empty array means no table are specified*

Example
```
# The tables to include/exclude
includes: []
excludes: []
```

## Telemetry
This is the anonymous project id that was created when initialization for telemetry usage.

Example
```
telemetry:
  id: xxx
```