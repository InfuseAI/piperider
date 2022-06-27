# assert_column_in_types

- Description: The column type should be one of the type in the list.
- Assert:
	- types: [`numeric`, `string`, or `datetime`]
- Tags:

### YAML
```
your_table_name:
  columns:
    your_coluumn_name:
      tests:
      - name: assert_column_in_types
        assert:
          types: [string, datetime]
        tags:
          - OPTIONAL
```
