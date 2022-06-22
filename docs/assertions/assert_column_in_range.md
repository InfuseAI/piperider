# assert_column_in_range

- Description: The minimum and maximum values of a column should be between min_value and max_value.
- Assert:
	- range: [min_value, max_value]
- Tags:

### YAML
```
your_table_name:
  columns:
    your_coluumn_name:
      tests:
      - name: assert_column_in_range
        assert:
          range: [10, 20]
        tags:
          - OPTIONAL
```
