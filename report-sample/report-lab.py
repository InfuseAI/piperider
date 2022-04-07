import pandas as pd
from piperider_cli.ydata.data_expectations import DataExpectationsReporter

if __name__ == '__main__':
    # This is the DataFrame used in the demo from GE tutorials
    df = pd.read_csv('taxi_yellow_tripdata_sample_2019-01.csv')

    # This is a sample json log taken from a validation run
    results_json_path = 'taxi_long.json'
    der = DataExpectationsReporter()

    results = der.evaluate(results_json_path, df)

    # warnings
    warnings = der.get_warnings()
    print(warnings)
