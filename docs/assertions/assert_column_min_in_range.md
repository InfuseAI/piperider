# assert_column_min_in_range

- Description: The minimum value of column should be between min_value and max_value.
- Assert:
	- min: [min_value, max_value]
- Tags:

### YAML
```
your_table_name:
  columns:
    your_column_name:
      tests:
      - name: assert_column_min_in_range
        assert:
          min: [10, 20]
        tags:
          - OPTIONAL
```
