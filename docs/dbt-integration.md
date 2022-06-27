# DBT Integration

Piperider can integrate the assets and artifacts from a dbt project. The project would

1. Use dbt profile to connect the data source
2. Use dbt generated catalog to profile and validate the data

# Init a DBT-Integrated Project

1. Go to the folder with dbt project file `dbt_project.yml`
2. Run `piperider init`

It will search the dbt_project.yml under the folder and sub-folders. And if the file is found, it will generate the
piperider config like this

```yaml
dataSources:
- name: my_dbt_project
  type: snowflake
  dbt:
    profile: my_dbt_project
    target: dev
    projectDir: .
```

The `dbt` field can have these configs

Name | Description | Required
-----|-------------|-----------
profile | Which profile to load | Yes
target | Which target to load for the given profile | Yes
projectDir |  Which directory to look in for the dbt_project.yml file. | Yes
profilesDir | Which directory to look in for the profiles.yml file | No, default `~/.dbt`

# Run

When issue `piperider run` with dbt-integrated project, it will

1. Find the connection information from dbt profiles file. (default is `~/.dbt/profiles`)
1. Parse `./target/catalog.json` and find the available tables
1. Profile and validate the data

You can use the environment variable `DBT_PROFILES_DIR` to override the default profiles.

# Use Different Profile Target

To use two different profile data, define two data sources

```yaml
dataSources:
- name: my_dbt_project
  type: snowflake
  dbt:
    profile: my_dbt_project
    target: dev
    projectDir: .
- name: my_dbt_project_prod
  type: snowflake
  dbt:
    profile: my_dbt_project
    target: prod
    projectDir: .    
```

When run a project, use the `--datasource` to specify the data source to run.

```bash
piperider run --datasource my_dbt_project_prod
```

# Example Project

[dbt-infuse-finance](https://github.com/InfuseAI/dbt-infuse-finance)