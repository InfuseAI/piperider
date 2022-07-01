FROM python:3.9-slim
ARG PIPERIDER_VERSION=0.3.0

RUN apt-get update && \
    apt-get install -y --no-install-recommends git \
    && apt-get purge -y --auto-remove \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir piperider==${PIPERIDER_VERSION}

WORKDIR /usr/src/github/

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
