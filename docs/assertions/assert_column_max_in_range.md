# assert_column_max_in_range

- Description: The maximum value of column should be between min_value and max_value.
- Assert:
	- max: [min_value, max_value]
- Tags:

### YAML
```
your_table_name:
  columns:
    your_coluumn_name:
      tests:
      - name: assert_column_max_in_range
        assert:
          max: [10, 20]
        tags:
          - OPTIONAL
```
