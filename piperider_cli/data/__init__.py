import os.path
import tarfile
import json
from convert_to_exp import convert_to_ge_expectations

PANDAS_DATASOURCE = 'great_expectations_local_pandas.tgz'

from ruamel.yaml import YAML

yaml = YAML(typ="safe")
yaml.default_flow_style = False


def convert_to_ge_datasource(source_file):
    with open(source_file, 'r') as fh:
        cfg = yaml.load(fh)
        cfg = cfg['data']
        datasource_type = cfg['type']

    if 'file' == datasource_type:
        # a filename
        # update great_expectations.yml
        template = get_example_by_name('datasources_filesystem.yml')
        template = template.replace('$BASE', os.getcwd())
        return cfg['file'], yaml.load(template)


def create_ge_workspace(target_dir: str, source_file, stage_file):
    # Note: suite and checkpoint name are hardcode to "mydata"
    #       filename is hardcode "train.csv"

    filename, datasource = convert_to_ge_datasource(source_file)
    extract_ge_data(target_dir)

    # update datasource
    ge_cfg_path = os.path.join(target_dir, 'great_expectations/great_expectations.yml')
    with open(ge_cfg_path) as fh:
        ge_cfg = yaml.load(fh)
        ge_cfg['datasources'] = datasource['datasources']

    with open(ge_cfg_path, 'w') as fh:
        yaml.dump(ge_cfg, fh)

    # TODO update checkpoint
    checkpont_cfg = os.path.join(target_dir, 'great_expectations/checkpoints/mydata.yml')
    with open(checkpont_cfg, 'w') as fh:
        template = get_example_by_name('checkpoint.yml')
        fh.write(template.replace('$FILENAME', filename))

    # TODO update expectation
    results = convert_to_ge_expectations(stage_file)
    results = results[0]
    ge_exp_path = os.path.join(target_dir, 'great_expectations/expectations/mydata.json')
    with open(ge_exp_path, 'w') as fh:
        json.dump(results, fh, indent=2, sort_keys=True)


def generate_expectation_suite(context):
    from great_expectations.core.batch import BatchRequest
    from great_expectations.profile.user_configurable_profiler import UserConfigurableProfiler
    batch_request = {'datasource_name': 'my_datasource', 'data_connector_name': 'default_inferred_data_connector_name',
                     'data_asset_name': 'train.csv', 'limit': 1000}
    expectation_suite_name = "mydata"
    validator = context.get_validator(
        batch_request=BatchRequest(**batch_request),
        expectation_suite_name=expectation_suite_name
    )
    column_names = [f'"{column_name}"' for column_name in validator.columns()]
    print(f"Columns: {', '.join(column_names)}.")
    validator.head(n_rows=5, fetch_all=False)

    # run profile
    ignored_columns = []
    profiler = UserConfigurableProfiler(
        profile_dataset=validator,
        excluded_expectations=None,
        ignored_columns=ignored_columns,
        not_null_only=False,
        primary_or_compound_key=False,
        semantic_types_dict=None,
        table_expectations_only=False,
        value_set_threshold="MANY",
    )
    suite = profiler.build_suite()
    print(validator.get_expectation_suite(discard_failed_expectations=False))
    validator.save_expectation_suite(discard_failed_expectations=False)


def get_context(target_dir):
    from great_expectations.data_context.data_context import DataContext
    context = DataContext(context_root_dir=os.path.join(target_dir, 'great_expectations'))
    return context


def extract_ge_data(target_dir):
    location = os.path.dirname(os.path.abspath(__file__))
    ge_tarfile = os.path.join(location, PANDAS_DATASOURCE)
    with tarfile.open(ge_tarfile) as tf:
        tf.extractall(target_dir)


def get_example_by_name(filename):
    location = os.path.dirname(os.path.abspath(__file__))
    example_file = os.path.join(location, 'examples', filename)
    with open(example_file, 'r') as fh:
        return fh.read()


if __name__ == '__main__':
    f = os.path.join(os.path.dirname(__file__), 'examples/source_local.yml')
    s = os.path.join(os.path.dirname(__file__), 'examples/stage_local.yml')
    create_ge_workspace('./foobarbar', f, s)
