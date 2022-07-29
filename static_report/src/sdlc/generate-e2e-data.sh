#!/bin/bash
# For generating comparison_data.json from `piperider-getting-started`
# NOTE: This file assumes you are calling from the root of repo

# clone repo
git clone https://github.com/InfuseAI/piperider-getting-started.git

cd piperider-getting-started

# Fetch data sqlite - First run.json #1
curl -o data/sp500.db https://piperider-data.s3.ap-northeast-1.amazonaws.com/getting-started/sp500_20220401.db

piperider run --no-interaction --debug #first run

# Fetch data sqlite - Second run.json #2
curl -o data/sp500.db https://piperider-data.s3.ap-northeast-1.amazonaws.com/getting-started/sp500_20220527.db

piperider run --no-interaction --debug #second run

# Gather base/target refs for comparison-report
E2E_SR_REPORTS="./.piperider/outputs/*"
ARR_PATHS=();
for FILE_PATH in $E2E_SR_REPORTS; do 
	ARR_PATHS+=($FILE_PATH)
done

# generate comparison report
piperider compare-reports --base ${ARR_PATHS[0]}/run.json --target ${ARR_PATHS[1]}/run.json --debug
cd ..
