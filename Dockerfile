FROM python:3.9-slim

WORKDIR /usr/src/app/

COPY piperider_cli piperider_cli/
COPY tests tests/
COPY docs docs/
COPY requirements.txt .
COPY LICENSE .
COPY README.md .
COPY setup.py .

RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /usr/src/github/

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
