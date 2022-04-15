# piperider-cli

This is a command line interface for PipeRider.

# Installation

```bash
$ pip install git+https://github.com/InfuseAI/piperider-cli.git@main
```

# Initialization

```bash
$ piperider-cli init
```

It will create a directory `piperider` in current working directory with four subdirectory:
- `sources`: contains configurations for data sources, such as S3 and SnowFlake
- `stages`: contains configurations for tests in each stage
- `assertions`: contains custom assertions for current project
- `harness`: contains configurations for PipeRider

# Run Tests

Run test for single stage:
```bash
$ piperider-cli run piperider/stages/local.yaml
```

Run test for multiple stages:
```bash
$ piperider-cli run piperider/stages/*.yaml
```
