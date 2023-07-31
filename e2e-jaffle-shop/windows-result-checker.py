import os

path = "e2e-jaffle-shop/jaffle_shop/.piperider/comparisons/latest/summary.md"

if os.path.exists(path):
    print(f"The path '{path}' exists.")
else:
    print(f"The path '{path}' does not exist.")
    exit(1)  # Indicate error with exit code 1
