#!/bin/bash
# For generating comparison_data.json from `piperider-getting-started`
# NOTE: This file assumes you are calling from the root of repo

# runtest002 -> invoke piperider compare-reports --base <> --target <>

cd piperider-getting-started
E2E_SR_REPORTS="./.piperider/outputs/*"
ARR_PATHS=();
for FILE_PATH in $E2E_SR_REPORTS; do 
	ARR_PATHS+=($FILE_PATH)
done

# generate comparison report
piperider compare-reports --base ${ARR_PATHS[0]}/run.json --target ${ARR_PATHS[1]}/run.json --debug
cd ..