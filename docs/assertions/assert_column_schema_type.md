# assert_column_schema_type

- Description: The column schema type should be specific schema type.
- Assert:
  - schema_type: `TEXT`, `DATE`, `VARCHAR(128)`, or etc...
- Tags:

### YAML

```
your_table_name:
  columns:
    your_coluumn_name:
      tests:
      - name: assert_column_schema_type
        assert:
          schema_type: TEXT
        tags:
          - OPTIONAL
```
