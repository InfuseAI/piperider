# assert_row_count_in_range

- Description: The row count should be between min_count and max_count.
- Assert:
	- count: [min_count, max_count]
- Tags:

### YAML
```
your_table_name:
  tests:
  - name: assert_row_count_in_range
    assert:
      count: [10, 20]
    tags:
      - OPTIONAL
```
