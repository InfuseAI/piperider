#!/usr/bin/env bash

git config --global user.email "dev-ci@infuseai.io"
git config --global user.name "dev-ci"

# Move to the e2e directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
pwd

# Show dbt version
dbt --version

# Reference
# https://docs.piperider.io/get-started/quick-start
#

# Step 1: clone the repo
git clone https://github.com/dbt-labs/jaffle_shop.git
cd jaffle_shop

# Step 2: create the configuration
cat >profiles.yml <<EOF
# ./profiles.yml
jaffle_shop:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: jaffle_shop.duckdb
EOF

# Generate seed files
python ../gen_seed.py

# Step 3: the first dbt build
dbt build

## Tag models
git apply ../0001-apply-tags.patch
git add .
git commit -m "Added PipeRider tags"

## show selected
echo "dbt list with selector"
dbt list -s tag:piperider

## Make a change to the project
git checkout -b feature/add-average-value-per-order
git apply ../0002-Add-average_value_per_order-to-customers.patch
git commit -sam "Add average_value_per_order to customers"

## Compare your branch with main
piperider compare
