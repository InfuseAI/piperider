#!/usr/bin/env python
import os
from distutils.core import setup

from setuptools import find_packages  # type: ignore


def _get_version():
    version_file = os.path.normpath(os.path.join(os.path.dirname(__file__), 'piperider_cli', 'VERSION'))
    with open(version_file) as fh:
        version = fh.read().strip()
        return version


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
      python_requires=">=3.7",
      packages=find_packages(),
      install_requires=[
          'ruamel.yaml',
          'sqlalchemy>=1.3.18',
          'sentry-sdk',
          'rich',
          'click>=7.1',
          'python-dateutil',
          'inquirer',
          'jinja2',
          'portalocker',
          'requests',
          'deepmerge',
      ],
      extras_require={
          'snowflake': [
              'snowflake-sqlalchemy<1.4.0'
          ],
          'postgres': [
              # you need a postgres for m1 to install psycopg2
              'psycopg2-binary'
          ],
          'dev': [
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
          "Programming Language :: Python :: 3.7",
          "Programming Language :: Python :: 3.8",
          "Programming Language :: Python :: 3.9",
          "License :: OSI Approved :: Apache Software License",
          "Operating System :: OS Independent",
          "Development Status :: 4 - Beta"
      ],
      package_data={
          'piperider_cli': ['*.json', 'VERSION', 'data/**', 'profiler/schema.json']
      })
