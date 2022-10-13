# Assertion YAML

PipeRider will parse all yaml files at `.piperider/assertions`. Grouping assertions by files is a way to organize your assertions. Using piperider diagnose to verify the format of assertion yaml files.
Whether recommended assertions or assertion templates, the format looks like the example below. You can use [built-in assertion](assertions-builtin.md) or [custom assertions](assertions-custom.md) against tables or columns depending on the assertions.

```
Table_name_1:
  # Test Cases for Table
  tests:
  - metric: row_count
    assert:
      lte: 1000000 
  columns:
    column_name:
      tests:
      - name: assert_column_not_null
      - name: assert_column_unique
      - name: assert_column_value
        assert:
          gte: 0
          lte: 100
      - metric: avg
        assert:
          gte: 45
          le: 55
        
Table_name_2:
  columns:
    column_id:
      tests:
      - name: assert_column_not_null
      - name: assert_column_unique
```        