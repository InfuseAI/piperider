# assert_row_count

- Description: The row count should be between min_count and max_count.
- Assert:
	- count: [min_count, max_count]
- Tags:

### YAML
```
your_table_name:
  tests:
  - name: assert_row_count
    assert:
      count: [10, 20]
    tags:
      - OPTIONAL
```
