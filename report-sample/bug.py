if __name__ == '__main__':
    import pandas as pd
    from piperider_cli.ydata.data_expectations import DataExpectationsReporter

    all_columns = ['o_orderkey', 'o_custkey', 'o_orderstatus', 'o_totalprice', 'o_orderdate', 'o_orderpriority',
                   'o_clerk', 'o_shippriority', 'o_comment']
    report_file = 'bug.json'
    df = pd.DataFrame(columns=all_columns)
    print("columns: ", all_columns)
    der = DataExpectationsReporter()
    results = der.evaluate(report_file, df)
    # TODO more report from results
    expectations_report, expectations_dense = results['Expectation Level Assessment']
    expectations_report
    print(expectations_report)
