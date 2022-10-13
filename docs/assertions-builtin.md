# Basic Assertions
## assert_column_unique

- Description: The column values should be unique.
- Assert: `None`

<details>
  <summary>YAML Example</summary>

```
your_table_name:
  columns:
    your_column_name:
      tests:
      - name: assert_column_unique
```

</details>

## assert_column_not_null

- Description: The column values should not be null.
- Assert: `None`

<details>
  <summary>YAML Example</summary>

```
your_table_name:
  columns:
    your_column_name:
      tests:
      - name: assert_column_not_null
```
</details>
    

## assert_column_value

- Description: Assert the column value should be in the range.
- Assert:
    - `gte`:  the value should be greater than or equal to
    - `gt`:  the value should be greater than
    - `lte`:  the value should be less than or equal to
    - `lt`:  the value should be less than

<details>
  <summary>YAML Example: The value should be between [0, 10000)  </summary>

```
world_city:
  columns:
    population:
      tests:
      - name: assert_column_value
        assert:
            gte: 0
            le: 10000
```
</details>
<details>
  <summary>YAML Example: The value of a datetime column should be >= '2022-01-01'  </summary>

```
world_city:
  columns:
    create_at:
      tests:
      - name: assert_column_value
        assert:
          gte: '2022-01-01;
```
</details>

# Schema Assertions

## assert_column_exist

- Description: The column should exist.
- Assert: None

<details>
  <summary>YAML Example</summary>

```
your_table_name:
  columns:
    your_column_name:
      tests:
      - name: assert_column_exist
```
</details>

## assert_column_type

- Description: The column type should be specific type.
- Assert:
	- type: one of `string`, `integer`, `numeric`, `datetime`, `boolean`, `other`

<details>
  <summary>YAML Example</summary>

```
your_table_name:
  columns:
    your_column_name:
      tests:
      - name: assert_column_type
        assert:
          type: numeric
```
</details>

## assert_column_schema_type

- Description: The column schema type should be specific schema type.
- Assert:
  - schema_type: the schema type in data source. (e.g. `TEXT`, `DATE`, `VARCHAR(128)`, ...)

<details>
  <summary>YAML Example</summary>

```
your_table_name:
  columns:
    your_column_name:
      tests:
      - name: assert_column_schema_type
        assert:
          schema_type: TEXT
```
</details>

## assert_column_in_types

- Description: The column type should be one of the type in the list.
- Assert:
	- types: [...], list of `string`, `integer`, `numeric`, `datetime`, `boolean`, `other`

<details>
  <summary>YAML Example</summary>

```
your_table_name:
  columns:
    your_column_name:
      tests:
      - name: assert_column_in_types
        assert:
          types: [string, datetime]
```
</details>


# Metric-based Assertion


- Description: Metric-based assertions are assert the value of a metric.
- Assert:
    - `gte`:  the value should be greater than or equal to
    - `gt`:  the value should be greater than
    - `lte`:  the value should be less than or equal to
    - `lt`:  the value should be less than
    - `eq`:  the value should equal to
    - `ne`:  the value should not equal to

<details>
  <summary>YAML Example: The row count should be <= 1000000</summary>

```
world_city:
  tests:
  - metric: row_count
    assert:
      lte: 1000000
```
</details>    
<details>
  <summary>YAML Example: The missing percentage should be <= 0.01</summary>

```
world_city:
  columns:
    country_code:
      tests:
      - metrics: nulls_p
        assert:
          lte: 0.01
```
</details>
<details>
  <summary>YAML Example: The median should be between [10, 20]</summary>

```
world_city:
  columns:
    country_code:
      tests:
      - metrics: p50
        assert:
          gte: 10
          lte: 20
```
</details>


For all available metrics, please see the [metric document](metrics.md)
