#!/usr/bin/env python
import os
from distutils.core import setup

from setuptools import find_packages  # type: ignore


def _get_version():
    version_file = os.path.normpath(os.path.join(os.path.dirname(__file__), 'piperider_cli', 'VERSION'))
    with open(version_file) as fh:
        version = fh.read().strip()
        return version


duckdb_require_packages = [
    'duckdb>=0.4.0',
    'duckdb-engine>=0.6.1',
    'chardet>=5.0.0',
]

setup(name='piperider',
      version=_get_version(),
      description='PiperRider CLI',
      long_description=open('README.md').read(),
      long_description_content_type='text/markdown',
      author='InfuseAI Dev Team',
      author_email='dev@infuseai.io',
      url='https://github.com/InfuseAI/piperider',
      entry_points={
          'console_scripts': ['piperider = piperider_cli.cli:cli']
      },
      python_requires=">=3.8",
      packages=find_packages(),
      install_requires=[
          'ruamel.yaml<0.18.0',
          'sqlalchemy>=1.4',
          'sentry-sdk',
          'rich>=12.0.0',
          'click>=7.1',
          'python-dateutil',
          'inquirer>=2.10.0',
          'jinja2',
          "jsonschema>=3.2.0",
          'portalocker',
          'requests>=2.28.1',
          'requests_toolbelt>=0.9.1',
          'deepmerge',
          'dbt-core>=1.3'
      ],
      tests_require=['pytest'],
      extras_require={
          'snowflake': [
              'snowflake-sqlalchemy>=1.4.6',
              'snowflake-connector-python>=2.9'
          ],
          'postgres': [
              # you need a postgres for m1 to install psycopg2
              'psycopg2-binary'
          ],
          'bigquery': [
              'sqlalchemy-bigquery>=1.6',
          ],
          'redshift': [
              'sqlalchemy-redshift',
              'redshift-connector',
              'psycopg2-binary',
              'boto3>=1.24.11',
          ],
          'athena': [
              'PyAthena[SQLAlchemy]'
          ],
          'databricks': [
              'databricks-sql-connector'
          ],
          'duckdb': duckdb_require_packages,
          'csv': duckdb_require_packages,
          'parquet': duckdb_require_packages,
          'dev': [
              'tox',
              'pytest>=4.6',
              'pytest-flake8',
              'flake8==3.9.2',
              'pytest-mypy',
              'pytest-cov',
              'twine',
              'jsonschema',
          ],
      },
      project_urls={
          "Bug Tracker": "https://github.com/InfuseAI/piperider/issues",
      },
      classifiers=[
          "Programming Language :: Python :: 3.8",
          "Programming Language :: Python :: 3.9",
          "Programming Language :: Python :: 3.10",
          "Programming Language :: Python :: 3.11",
          "License :: OSI Approved :: Apache Software License",
          "Operating System :: OS Independent",
          "Development Status :: 4 - Beta"
      ],
      package_data={
          'piperider_cli': ['*.json', 'VERSION', 'SENTRY_DNS', 'data/**', 'profiler/schema.json',
                            'recipes/recipe_schema.json']
      })
