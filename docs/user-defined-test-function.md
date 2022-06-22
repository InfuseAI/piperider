# User defined test function

In addition to builtins assertion function, PipeRider also supports adding customized assertion function. User defined
test functions are put at a regular Python Module.

## How does it work?

There is a customized assertion in our assertion configuration `customized_assertions.assert_nothing_table_example`.

```yaml

data: # Table Name
  # Test Cases for Table
  tests:
    - name: customized_assertions.assert_nothing_table_example
      assert:
        param1: value1
```

That means

1. You have put the `customized_assertions.py` into PipeRider plugin search path.
2. There must be a function named `assert_nothing_table_example` in the `customized_assertions.py`

### Plugin Search Path

PipeRider will find plugins in this order:

* ./piperider/plugins
* environment variable `PIPERIDER_PLUGINS`

For example, the user defined test functions could be at:

* the default search path: `./piperider/plugins/customized_assertions.py`
* somewhere of `PIPERIDER_PLUGINS`

```bash
export PIPERIDER_PLUGINS=/foo/bar
/foo/bar/customized_assertions.py
```

## Implementation customized assertion

After you `init` the PipeRider, you can find two examples at the `./piperider/plugins/customized_assertions.py`.

* assert_nothing_table_example
* assert_nothing_column_example

The customized assertion must have the same method signature and return an `AssertionResult` like this:

```python
def assert_nothing_table_example(context: AssertionContext,
                                 table: str,
                                 column: str,
                                 metrics: dict) -> AssertionResult:
  return context.result.success()
```

When the assertion has been called, PipeRider will put all arguments for you:

* context: helper object for assembling result entry to the report.
* table: the table name you are asserting.
* column: the column name you are checking, but it could be null when the assertion is put on the table level assertion.
* metrics: the profiling output could be asserted.

### Assertion process

You might follow this steps to implement the assertion process:

1. Get metric by table and column (The fact you see from the metric)
2. Get assert settings from context (The expectation written in the assertion yaml)
3. Check metric and assert and decide the result `pass` or `failed`

We will explain each steps with concrete examples in the `customized_assertions.py`

#### Get metric

`metrics` is a python dict object, we could look up it with `table` and `column`.

Table level metric:

```python
table_metrics = metrics.get('tables', {}).get(table)
if not table_metrics:
  # cannot find the table in the metrics
  return context.result.fail()
```

Column level metric:

```python
column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
if column_metrics is None:
  # cannot find the column in the metrics
  return context.result.fail()
```

#### Get assert

`assert` is the expectation put on the configuration file, like this:

```yaml
tests:
  - name: customized_assertions.assert_nothing_table_example
    assert:
      param1: value1
```

In the function, you can get the value of `param1` in this way:

```python
expected = context.asserts.get('param1', '')
```

#### Return result

You can conclude a result to the report. Before that, you need an actual value in the result. Don't forget to set up it:

```python
context.result.actual = 'something I saw from the metrics'
```

Finally, you could return the result:

```python
return context.result.success() 
```

```python
return context.result.fail()
```

## Profiling Data

You might want to know what kinds of data you have in the `metric` dict? There is a `.profiler.json` in the output path
of the `run` command. Open it and check the content:

```
ls -alh $(MY_PROJECT)/.piperider/outputs/$(DATASOURCE)-$(TIMESTAMP)
total 48
drwxr-xr-x   4 piperider  staff   128B  6  1 09:35 .
drwxr-xr-x  26 piperider  staff   832B  6  1 09:35 ..
-rw-r--r--   1 piperider  staff   6.2K  6  1 09:35 .profiler.json
-rw-r--r--   1 piperider  staff    15K  6  1 09:35 data.json
```
