# Setting up development environment

1. You can use Python `venv` or `virtualenv` to setup the environment of development PipeRider.

  ```bash
  # Use venv
  python -m venv .venv
  source .venv/bin/activate

  # Use virtualenv
  pip install virtualenv
  virtualenv .venv
  source .venv/bin/activate
  ```

2. Clone the PipeRider repo

  ```bash
  git clone git@github.com:InfuseAI/piperider.git
  cd piperider  
  ```

3. Install dependencies

  ```bash
  pip install -r requirements.txt

  # Or using Makefile to install dependencies
  make
  ```

4. Run the PipeRider CLI

  ```bash
  piperider init
  ```
