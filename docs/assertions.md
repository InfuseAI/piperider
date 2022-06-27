# Assertions

In a piperider project, we can define assertions to validate the data in an expected state.

The tests are defined in `.piperider/assertions/{table}.yml`. Here is the example config

```yaml
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

To find the built-in tests, please see [assertions](./assertions/)

# Range Semantic

Usually, the expected value is defined as a range (e.g [0, 100]). The semantic is from 0 (inclusive) to 100 (exclusive)
