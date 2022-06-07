# assert_column_type

- Description: The column type should be specific type.
- Assert:
	- type: `numeric`, `string`, or `datetime`
- Tags:

### YAML
```
your_table_name:
  columns:
    your_coluumn_name:
      tests:
      - name: assert_column_type
        assert:
          type: numeric
        tags:
          - OPTIONAL
```
