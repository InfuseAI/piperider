#!/usr/bin/env python
import os
from distutils.core import setup

from setuptools import find_packages  # type: ignore


def _get_version():
    version_file = os.path.normpath(os.path.join(os.path.dirname(__file__), 'piperider_cli', 'VERSION'))
    with open(version_file) as fh:
        version = fh.read().strip()
        return version


setup(name='piperider-cli',
      version=_get_version(),
      description='PiperRider CLI',
      long_description=open('README.md').read(),
      long_description_content_type='text/markdown',
      author='InfuseAI Dev Team',
      author_email='dev@infuseai.io',
      url='https://github.com/InfuseAI/piperider-cli',
      entry_points={
          'console_scripts': ['piperider-cli = piperider_cli.cli:cli']
      },
      python_requires=">=3.6",
      packages=find_packages(),
      install_requires=[
          'ruamel.yaml',
          'sqlalchemy',
          'sentry-sdk',
          # 'snowflake-sqlalchemy',
          # you need a postgres for m1 to install psycopg2 ^^"
          # 'psycopg2-binary',
          'rich',
          'click',
          'python-dateutil',
          'inquirer',
      ],
      extras_require={
          'dev': [
              'pytest>=4.6',
              'pytest-flake8',
              'flake8==3.9.2',
              'pytest-mypy',
              'pytest-cov',
              'twine',
          ],
      },
      project_urls={
          "Bug Tracker": "https://github.com/InfuseAI/piperider-cli/issues",
      },
      classifiers=[
          "Programming Language :: Python :: 3",
          "License :: OSI Approved :: Apache Software License",
          "Operating System :: OS Independent",
          "Development Status :: 4 - Beta"
      ],
      package_data={
          'piperider_cli': ['*.json', 'VERSION', 'data/**']
      })
