# Setting up development environment

1. You can use Python `venv` or `virtualenv` to setup the environment of development PipeRider.

  ```bash
  # Use venv
  python -m venv .venv
  source .venv/bin/activate

  # Use virtualenv
  pip install virtualenv
  virtualenv .venv
  source .venv/bin/activate
  ```

2. Clone the PipeRider repo

  ```bash
  git clone git@github.com:InfuseAI/piperider.git
  cd piperider  
  ```

3. Install dependencies

  ```bash
  pip install -r requirements.txt

  # Or using Makefile to install dependencies
  make
  ```

4. Run the PipeRider CLI

  ```bash
  piperider init
  ```

## tox for piperider

Utilize [tox](https://tox.wiki/en/4.7.0/) to test the integration of dbt with various Python versions.

> tox aims to automate and standardize testing in Python.


### Usage

After installing `tox`, we can find the environment list by `-l` 

```bash
$ tox -l
py38-dbt13
py39-dbt14
py39-dbt15
py39-dbt16
py310-dbt14
py310-dbt15
py310-dbt16
py311-dbt14
py311-dbt15
py311-dbt16
```

It will run tests in all environments if you are not pick up a specific environment

```bash
tox
```

You can run tests in a specific environment by `-e`

```bash
tox -e py38-dbt13
```

### Run a chosen test case

We need to execute a selected test case for a deeper analysis. See this example:

```bash
========================================================================= short test summary info ==========================================================================
FAILED tests/test_dbt_util.py::TestRunner::test_load_dbt_resources - assert 1 == 2
========================================================== 1 failed, 91 passed, 12 skipped, 76 warnings in 5.39s ===========================================================
py38-dbt13: exit 1 (5.71 seconds) /Users/qrtt1/temp/piperider> pytest --color=yes pid=15609
.pkg: _exit> python /Users/qrtt1/temp/piperider/venv/lib/python3.10/site-packages/pyproject_api/_backend.py True setuptools.build_meta __legacy__
  py38-dbt13: FAIL code 1 (9.16=setup[3.44]+cmd[5.71] seconds)
  evaluation failed :( (9.32 seconds)
```

To execute, you can select:

- A test file
- A test suite
- A specific test case

run a test file

```bash
tox -e py38-dbt13 -- tests/test_dbt_util.py
```

run a test suite

```bash
tox -e py38-dbt13 -- tests/test_dbt_util.py::TestRunner
```

run a test case

```bash
tox -e py38-dbt13 -- tests/test_dbt_util.py::TestRunner::test_load_dbt_resources
```