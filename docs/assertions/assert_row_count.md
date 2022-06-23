# assert_row_count

- Description: The row count should be >= min or <= max. If min is not specified, it is assumed to be 0. If max is not
  specified, it is assumed to be infinity. If min and max are both specified, min must be less than or equal to max.
- Assert:
  - min: min_count
  - max: max_count
- Tags:

### YAML

Provide the minimum and maximum row count in the following format

```
your_table_name:
  tests:
  - name: assert_row_count
    assert:
      min: 10
      max: 20
    tags:
      - OPTIONAL
```

Or only provide the minimum row count in the following format

```
your_table_name:
  tests:
  - name: assert_row_count
    assert:
      min: 100
    tags:
      - OPTIONAL
``` 
