:: Set Git global configurations
git config --global user.email "dev-ci@infuseai.io"
git config --global user.name "dev-ci"

:: Move to the e2e directory
pushd "%~dp0"
echo Current Directory: %CD%

:: Show dbt version
dbt --version

:: Reference
:: https://docs.piperider.io/get-started/quick-start

:: Step 1: Clone the repo
git clone https://github.com/dbt-labs/jaffle_shop.git
cd jaffle_shop

:: Step 2: Create the configuration
echo ^>^> Creating profiles.yml
echo. > profiles.yml
echo jaffle_shop: >> profiles.yml
echo   target: dev >> profiles.yml
echo   outputs: >> profiles.yml
echo     dev: >> profiles.yml
echo       type: duckdb >> profiles.yml
echo       path: jaffle_shop.duckdb >> profiles.yml

:: Generate seed files
python ..\gen_seed.py

:: Step 3: The first dbt build
dbt build

:: Tag models
git apply ..\0001-apply-tags.patch
git add .
git commit -m "Added PipeRider tags"

:: Show selected
echo dbt list with selector
dbt list -s tag:piperider

:: Make a change to the project
git checkout -b feature/add-average-value-per-order
git apply ..\0002-Add-average_value_per_order-to-customers.patch
git commit -sam "Add average_value_per_order to customers"

:: Compare your branch with main
piperider compare

:: Restore previous directory
popd
