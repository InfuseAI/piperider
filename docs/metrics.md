# Supported Metrics

# Table Metrics

| Metric                    | Description                                                                      | Field          | Assertion | Since   |
| ------------------------- | -------------------------------------------------------------------------------- | -------------- | :-------: | ------- |
| Row count                 | Number of rows in this table                                                     | `row_count`    | o         |         |
| Column count              | Number of columns in this table                                                  | `col_count`    |           |         |
| Sample count              | Number of rows been profiled. If no row limit is configured, the sample count is always the same as the row count. | `samples`      |           | 0.10.0  |
| Sample percentage         | Percentage of rows been profiled                                                 | `samples_p`    |           | 0.11.0  |
| Volume size *\**          | The volume size of this table in bytes                                           | `bytes`        | o         | 0.8.0   |
| Created time *\**         | The time that this table created at in ISO 8601 format including time zone       | `created`      |           | 0.8.0   |
| Last altered time *\**    | The last time that this table modified at in ISO 8601 format including time zone | `last_altered` |           | 0.8.0   |
| Freshness *\**            | Time differentiation between the current time and table's last altered time      | `freshness`    | o         | 0.8.0   |
| Duplicate row count       | Number of duplicate rows in this table                                           | `duplicate_rows`   | o     | 0.10.0  |
| Duplicate row percentage  | Percentage of duplicate rows in this table                                       | `duplicate_rows_p` | o     | 0.11.0  |

_\* These metrics are taken out of the data sources' table metadata. All of these metadata are not offered by all data sources. Please refer to the supporting matrix below._

| Metric            | Snowflake | BigQuery | Redshift | Others |
| ----------------- | :-------: | :------: | :------: | :----: |
| Volume size       |     o     |    o     |    o     |        |
| Created time      |     o     |    o     |          |        |
| Last altered time |     o     |    o     |          |        |
| Freshness         |     o     |    o     |          |        |

# Column Metrics

### Schema

| Metric       | Description                                                                                             | Column Type | Filed         | Assertion | Since |
| ------------ | ------------------------------------------------------------------------------------------------------- | ----------- | ------------- | :-------: | ----- |
| Schema Type  | The column type defined in data source                                                                  | All types   | `schema_type` |           |      |
| Generic type | A generic type of schema type. It can be `string`, `integer`, `numeric`, `datetime`, `boolean`, `other` | All types   | `type`        |           |      |

### Data Composition

Describe the composition of the data in one column. 

![](assets/metrics-composition.png)

| Metric                       | Description                                                | Column Type      | Field             | Assertion | Since   |
| ---------------------------- | ---------------------------------------------------------- | ---------------- | ----------------- | :-------: | ------- |
| Row count                    | Number of rows in this table                               | All types        | `total`           | o         |         |
| Sample count                 | Number of rows been profiled                               | All types        | `samples`         | o         | 0.10.0  |
| Sample percentage            | Percentage of rows been profiled                           | All types        | `samples_p`       | o         | 0.11.0  |
| Missing count                | The count of null values.                                  | All types        | `nulls`           | o         | 0.6.0   |
| Missing percentage           | The percentage of null values.                             | All types        | `nulls_p`         | o         | 0.11.0  |
| Non null count               | The count of non-null values.                              | All types        | `non_nulls`       | o         |         |
| Non null percentage          | The percentage of non-null values.                         | All types        | `non_nulls_p`     | o         | 0.11.0  |
| Invalid count                | The percentage of values that does not match the schema type. For example, a string in a numeric column. It only happen in sqlite | All types        | `invalids`        | o         | 0.6.0 |
| Invalid percentage           | The count of values that does not match the schema type. For example, a string in a numeric column. It only happen in sqlite | All types        | `invalids_p`        | o         | 0.11.0  |
| Valid count                  | The percentage of non-null minus invalid values            | All types        | `valids`          | o         | 0.6.0   |
| Valid percentage             | The count of non-null minus invalid values                 | All types        | `valids_p`        | o         | 0.11.0  |
| Zero count                   | The percentage of zero values                              | integer, numeric | `zeros`           | o         | 0.6.0   |
| Zero percentage              | The count of zero values                                   | integer, numeric | `zeros_p`         | o         | 0.11.0  |
| Negative value count         | The percentage of negative values                          | integer, numeric | `negatives`       | o         | 0.6.0   |
| Negative value percentage    | The count of negative values                               | integer, numeric | `negatives_p`     | o         | 0.11.0  |
| Positive value count         | The percentage of positive values                          | integer, numeric | `positives`       | o         | 0.6.0   |
| Positive value percentage    | The count of positive values                               | integer, numeric | `positives_p`     | o         | 0.11.0  |
| Zero length string count     | The percentage of empty strings                            | string           | `zero_length`     | o         | 0.6.0   |
| Zero length string percentage| The count of empty strings                                 | string           | `zero_length_p`   | o         | 0.11.0  |
| Non zero length string count      | The percentage of non empty strings                   | string           | `non_zero_length` | o         | 0.6.0   |
| Non zero length string percentage | The count of non empty strings                        | string           | `non_zero_length_p`| o        | 0.11.0  |
| True count                   | The count of true values                                   | boolean          | `trues`           | o         | 0.6.0   |
| True percentage              | The count of true values                                   | boolean          | `trues_p`         | o         | 0.11.0  |
| False count                  | The count of false values                                  | boolean          | `falses`          | o         | 0.6.0   |
| False percentage             | The count of false values                                  | boolean          | `falses_p`        | o         | 0.11.0  |

### General Statistic

The general statistic of a column

| Metric             | Description                         | Column Type                | Field    | Assertion | Since |
| ------------------ | ----------------------------------- | -------------------------- | -------- | :-------: | ----- |
| Min                | The value of the minimum item       | integer, numeric, datetime | `min`    | o         |       |
| Max                | The value of the maximum item       | integer, numeric, datetime | `max`    | o         |       |
| Average            | The average of a column.            | integer, numeric           | `avg`    | o         |       |
| Sum                | The sum of a column.                | integer, numeric           | `sum`    | o         |       |
| Standard deviation | The standard deviation of a column. | integer, numeric,          | `stddev` | o         | 0.4.0 |

### Text Length Statistic

The text length statistic of a column.

| Metric                   | Description                                           | Column Type | Field           | Assertion | Since  |
| ------------------------ | ----------------------------------------------------- | ----------- | --------------- | :-------: | ------ |
| Min length               | The minimum text length of a string column            | string      | `min_length`    | o         | 0.11.0 |
| Max length               | The maximum text length of a string column            | string      | `max_length`    | o         | 0.11.0 |
| Average length           | The average text length of a string column            | string      | `avg_length`    | o         | 0.11.0 |
| Std. Deviation of length | The standard deviation text length of a string column | string      | `stddev_length` | o         | 0.11.0 |

### Uniqueness

Analyze the uniqueness of a column

- Distinct: Count of distinct items
- Duplicates: Count of recurring items

For example, if a dataset is `(NULL, a, a, b, b, c, d, e)`

- Distinct = 5, `(a, b, c, d, e)`
- Duplicates = 4, `(a, a, b, b)`
- Non-duplicates = 3, `(c, d, e)`
- Missing = 1

The total number = missing + duplicates + non-duplicates

![](assets/metrics-uniqueness.png)

| Metric                    | Description                       | Column Type                        | Field              | Assertion | Since  |
| ------------------------- | --------------------------------- | ---------------------------------- | ------------------ | :-------: | ------ |
| Distinct count            | Count of distinct items           | integer, string, datetime,         | `distinct`         | o         |        |
| Distinct percentage       | Percentage of distinct items      | integer, string, datetime,         | `distinct_p`       | o         | 0.11.0 |
| Duplicate count           | Count of recurring items          | integer, numeric, string, datetime | `duplicates`       | o         | 0.6.0  |
| Duplicate percentage      | Percentage of recurring items     | integer, numeric, string, datetime | `duplicates_p`     | o         | 0.11.0 |
| Non duplicate count       | Count of non-recurring items      | integer, numeric, string, datetime | `non_duplicates`   | o         | 0.6.0  |
| Non duplicate percentage  | Percentage of non-recurring items | integer, numeric, string, datetime | `non_duplicates_p` | o         | 0.11.0 |

### Quantiles

Calculate the quantiles of a numeric or integer column

| Metric          | Description             | Column Type      | Field | Assertion | Since |
| --------------- | ----------------------- | ---------------- | ----- | :-------: | ----- |
| min             | min, 0th percentile     | integer, numeric | `min` | o         |       |
| 5th Percentile  | 5th percentile          | integer, numeric | `p5`  | o         | 0.4.0 |
| 25th Percentile | 25th percentile         | integer, numeric | `p25` | o         | 0.4.0 |
| Median          | median, 50th percentile | integer, numeric | `p50` | o         | 0.4.0 |
| 75th Percentile | 75th percentile         | integer, numeric | `p75` | o         | 0.4.0 |
| 95th Percentile | 95th percentile         | integer, numeric | `p95` | o         | 0.4.0 |
| max             | max, 100th percentile   | integer, numeric | `max` | o         |       |

### Distribution

| Metric                | Description                                                               | Column Type      | Field       | Assertion | Since |
| --------------------- | ------------------------------------------------------------------------- | ---------------- | ----------- | :-------: | ----- |
| Top K                 | The top n frequent items and counts                                       | integer, string  | `topk`      |           | 0.6.0 |
| histogram             | The evenly-split bins. Calculate the counts for each bin.                 | integer, numeric | `histogram` |           | 0.6.0 |
| Text length histogram | The evenly-split bins for text length. Calculate the counts for each bin. | string           | `histogram_length` |    | 0.6.0 |
| Date histogram        | The histogram of date, month, or year. Depends on the data min/max range. | datetime         | `histogram` |           | 0.6.0 |
