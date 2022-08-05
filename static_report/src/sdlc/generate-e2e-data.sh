#!/bin/bash
# For generating comparison_data.json from `piperider-getting-started`
# NOTE: This file assumes you are calling from the root of repo
# NOTE: Pass parameters to shell call e.g. $1
if [ $2 = "clean" ]; then
	rm -rf piperider-getting-started
fi

# First 2 run.jsons
if [ $1 = "first" ]; then
	echo "initializing...$1"

	git clone https://github.com/InfuseAI/piperider-getting-started.git
	cd piperider-getting-started

	# Fetch data sqlite - First run.json #1
	curl -o data/sp500.db https://piperider-data.s3.ap-northeast-1.amazonaws.com/getting-started/sp500_20220401.db

	piperider run --no-interaction --debug #first run

	# Fetch data sqlite - Second run.json #2
	curl -o data/sp500.db https://piperider-data.s3.ap-northeast-1.amazonaws.com/getting-started/sp500_20220527.db

	piperider run --no-interaction --debug #second run
fi

# edge-cases (another run.json)
if [ "$1" = "second" ]; then
	cd piperider-getting-started
	echo "initializing...$1"
	# Fetch data sqlite - Third run.json #3 (diff table)
	curl -o data/sp500.db https://piperider-data.s3.ap-northeast-1.amazonaws.com/integration-test-sqlite/profiler-e2e.db

	piperider run --no-interaction --debug # third run
fi

# Gather single run base/target refs for comparison-report
E2E_SR_REPORTS="./.piperider/outputs/*"
ARR_PATHS=()
for FILE_PATH in $E2E_SR_REPORTS; do
	ARR_PATHS+=($FILE_PATH)
done
# generate comparison report (base: latest, target: previous )
piperider compare-reports --base ${ARR_PATHS[0]}/run.json --target ${ARR_PATHS[1]}/run.json --debug

cd ..
