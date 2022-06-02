
# cli init

None

## Usage

```
Usage: cli init [OPTIONS]
```

## Options
* `provider`: 
  * Type: Choice('['dbt-local', 'customized']') 
  * Default: `dbt-local`
  * Usage: `--provider`

  Select the provider of datasource


* `dbt_project_path`: 
  * Type: <click.types.Path object at 0x102fa2fd0> 
  * Default: `none`
  * Usage: `--dbt-project-path`

  Path of dbt project config


* `dbt_profile_path`: 
  * Type: <click.types.Path object at 0x102fa2d60> 
  * Default: `/users/popcorny/.dbt/profiles.yml`
  * Usage: `--dbt-profile-path`

  Path of dbt profile config


* `debug`: 
  * Type: BOOL 
  * Default: `false`
  * Usage: `--debug`

  Enable debug mode


* `help`: 
  * Type: BOOL 
  * Default: `false`
  * Usage: `--help`

  Show this message and exit.



## CLI Help

```
Usage: cli init [OPTIONS]

Options:
  --provider [dbt-local|customized]
                                  Select the provider of datasource
  --dbt-project-path PATH         Path of dbt project config
  --dbt-profile-path PATH         Path of dbt profile config
  --debug                         Enable debug mode
  --help                          Show this message and exit.
```

