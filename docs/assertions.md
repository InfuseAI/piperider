# Assertions

In a piperider project, we can define assertions to validate the data in an expected state.

The tests are defined in `.piperider/assertions/{table}.yml`. Here is the example config

```
#mytable.yml
mytable:
  tests:
  - name: assert_row_count
    assert:
      count: [1, 10000000]
  columns:
    col1:
      tests: []
    col2:
      tests:
      - name: assert_column_min_in_range
        assert:
          min: [0, 50]
      - name: assert_column_max_in_range
        assert:
          max: [0, 100000]
```

# Built-in Tests

## assert_row_count (table)
Check if the row count is in a range

```
mytable:
  tests:
  - name: assert_row_count
    assert:
      count: [1, 10000000]
```      

## assert_column_min_in_range (column)
Check if the row count is in a range

```
mytable:
  columns:
    col1:
      tests:
      - name: assert_column_min_in_range
        assert:
            min: [0, 50]
```

## assert_column_max_in_range (column)
Check if the row count is in a range

```
mytable:
  columns:
    col1:
      tests:
      - name: assert_column_max_in_range
        assert:
            min: [0, 50]
```

# Range Semantic

Usually, the expected value is defined as a range (e.g [0, 100]). The semantic is from 0 (inclusive) to 100 (exclusive)
