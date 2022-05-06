import json

import pandas as pd

from piperider_cli.ydata.data_expectations import DataExpectationsReporter


def execute_ydata(columns, ge_report, ydata_report):
    df = pd.DataFrame(columns=columns)
    der = DataExpectationsReporter()
    ydata_result = der.evaluate(ge_report, df)
    expectations_report, expectations_dense = ydata_result['Expectation Level Assessment']

    # save ydata report
    with open(ydata_report, 'w') as fh:
        outputs = refine_ydata_result(ydata_result)
        fh.write(json.dumps(outputs))

    return expectations_report, expectations_dense, outputs['has_error']


def refine_ydata_result(results: dict):
    outputs = {'has_error': True}
    for k, v in results.items():
        if 'Expectation Level Assessment' == k:
            refined_assessment = list(v)
            for idx, elem in enumerate(refined_assessment):
                if isinstance(elem, pd.DataFrame):
                    refined_assessment[idx] = elem.to_json(orient='table')
                    outputs['has_error'] = False if elem['Successful?'].all() else True
            outputs[k] = refined_assessment
        else:
            outputs[k] = v
    return outputs
