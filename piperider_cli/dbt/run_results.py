from dataclasses import dataclass
from typing import Dict


def get_dbt_tests_result(manifest: Dict, run_results: Dict):
    output = []
    unique_tests = {}

    nodes = manifest.get('nodes')
    sources = manifest.get('sources')
    for result in run_results.get('results', []):
        unique_id = result.get('unique_id')

        node = nodes.get(unique_id)
        if node.get('resource_type') != 'test':
            continue

        # The test is just compiled, but not executed
        if result.get('status') == 'success':
            continue

        unique_tests[unique_id] = dict(
            status=result.get('status'),
            failures=result.get('failures'),
            message=result.get('message'),
            execution_time=result.get('execution_time')
        )

        test_node = node
        table = None
        depends_on_nodes = test_node.get('depends_on', {}).get('nodes', [])
        for depends_on_node_id in depends_on_nodes:
            depends_on_node = nodes.get(depends_on_node_id)
            if depends_on_node_id.startswith('source'):
                source = sources.get(depends_on_node_id)
                table = f"{source.get('source_name')}.{source.get('name')}"
                break
            elif depends_on_node.get('resource_type') in ['model', 'seed']:
                table = depends_on_node.get('name')
                break
        column = test_node.get('column_name')

        if table is None:
            continue

        output.append(dict(
            id=unique_id,
            name=unique_id,
            table=table,
            column=column if column != test_node['name'] else None,
            status='failed' if unique_tests[unique_id]['status'] == 'fail' else 'passed',
            execution_time=unique_tests[unique_id]['execution_time']
        ))

    return output


@dataclass
class RunResults2:
    elapsed_time: float
    tests: int

    @classmethod
    def from_dict(cls, dbt_run_results: Dict) -> "RunResults":
        results = dbt_run_results.get('results', [])
        tests = [x.get('unique_id') for x in results if x.get('unique_id', '').startswith('test.')]
        return RunResults(elapsed_time=dbt_run_results.get('elapsed_time'), tests=len(tests))
