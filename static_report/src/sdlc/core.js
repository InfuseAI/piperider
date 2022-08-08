import chalk from 'chalk';
import { config } from 'dotenv';
import { writeFile, readdir, readFile } from 'fs/promises';
import { parse } from 'node-html-parser';
import YAML from 'yaml';

// Load dotenv development configuration
config({
  path: '.env.development',
});

export const generateFile = async (fileName, fileData) => {
  try {
    await writeFile(fileName, fileData);
    log(chalk.green(`Created file: ${fileName}`));
  } catch (e) {
    throw new Error(chalk.red(e, `Check if file data exists!`));
  }
};
/**
 * Based on e2eFlag, will lookup based on reference `piperider-getting-started/` instead of root `.piperider/`
 * @param {boolean} e2eFlag
 * @returns {string} path of the latest comparison_data.json
 */
export const getComparisonDataPath = async (e2eFlag) => {
  const lookupPath =
    '../' +
    (e2eFlag ? `${MOUNT_PATH_TO_E2E_DATA}` : '.piperider') +
    '/comparisons';

  try {
    const reportName = (await readdir(lookupPath)).pop();
    return `${lookupPath}/${reportName}/${FILENAME_COMPARISON}`;
  } catch (e) {
    throw new Error(chalk.red(e, `Check if ${lookupPath} directory exists!`));
  }
};
export const getFileData = async (pathToReport) => {
  try {
    log(chalk.yellow(`Reading path: ${pathToReport} from ${process.cwd()}`));
    return JSON.parse(
      Buffer.from(
        await readFile(pathToReport, {
          encoding: 'utf-8',
        }),
      ),
    );
  } catch (e) {
    throw new Error(chalk.red(e, `Check if ${pathToReport} exists!`));
  }
};
export const getEmbeddedIndexHTML = async (dataMap) => {
  try {
    const html = parse(Buffer.from(await readFile(PATH_TO_INDEX)).toString());
    html.querySelector('#piperider-report-variables').textContent = `
        // PipeRider metadata
        window.PIPERIDER_METADATA = ${JSON.stringify(
          dataMap.get(METADATA_KEY) || '',
        )};
        // ${SINGLE_KEY} report
        window.PIPERIDER_SINGLE_REPORT_DATA = ${JSON.stringify(
          dataMap.get(SINGLE_KEY) || '',
        )};
        // ${COMPARISON_KEY} report
        window.PIPERIDER_COMPARISON_REPORT_DATA = ${JSON.stringify(
          dataMap.get(COMPARISON_KEY) || '',
        )};
    `;
    console.log(chalk.green(`Embedded data to HTML: ${PATH_TO_INDEX}`));
    return html;
  } catch (e) {
    throw new Error(chalk.red(e, `\nCheck if ${PATH_TO_INDEX} exists!`));
  }
};

export const getMetadata = async () => {
  const appVersion = Buffer.from(await readFile('../piperider_cli/VERSION'))
    .toString()
    .replace('\n', '');
  const sentryDns = Buffer.from(await readFile('../piperider_cli/SENTRY_DNS'))
    .toString()
    .replace('\n', '');
  let amplitudeUserID = '';
  let amplitudeProjectID = '';
  try {
    const piperiderProfilePath = `${process.env.HOME}/.piperider/profile.yml`;
    const piperiderConfigPath =
      process.argv[2] === 'e2e'
        ? '../piperider-getting-started/.piperider/config.yml'
        : '../.piperider/config.yml';
    const piperiderProfile = YAML.parse(
      Buffer.from(await readFile(piperiderProfilePath)).toString(),
    );
    const piperiderConfig = YAML.parse(
      Buffer.from(await readFile(piperiderConfigPath)).toString(),
    );
    amplitudeUserID = piperiderProfile.user_id;
    amplitudeProjectID = piperiderConfig.telemetry.id;
  } catch (e) {
    throw new Error(chalk.red(e));
  }

  return {
    name: 'PipeRider',
    version: appVersion,
    sentry_dns: sentryDns,
    sentry_env: 'development',
    amplitude_api_key: process.env.AMPLITUDE_API_KEY,
    amplitude_user_id: amplitudeUserID,
    amplitude_project_id: amplitudeProjectID,
  };
};

export const getSchemaDescriptions = async () => {
  log(chalk.yellow(`Reading path: ${PATH_TO_SCHEMA_JSON}`));
  try {
    const schemaJson = JSON.parse(
      Buffer.from(
        await readFile(PATH_TO_SCHEMA_JSON, {
          encoding: 'utf-8',
        }),
      ),
    );
    const defProperties = schemaJson?.definitions;
    const colProperties =
      schemaJson?.properties.tables.patternProperties['.+'].properties.columns
        .patternProperties['.+'].properties;
    const descriptions = Object.entries({
      ...colProperties,
      ...defProperties,
    }).reduce((prev, [key, { description }]) => {
      if (description) prev[key] = description;
      return prev;
    }, {});
    const filePath = 'src/sdlc/schema-meta.ts';

    writeFile(
      filePath,
      `export const schemaMetaDescriptions = ${JSON.stringify(
        descriptions,
        undefined,
        2,
      )}
    `,
    );
    log(chalk.green(`Created file: ${filePath}`));
  } catch (e) {
    throw new Error(chalk.red(e));
  }
};

export const isE2E = process.argv[2] === 'e2e';
export const log = console.log;
export const METADATA_KEY = 'metadata';
export const SINGLE_KEY = 'single';
export const COMPARISON_KEY = 'comparison';
export const PATH_TO_INDEX = 'public/index.html';
export const FILENAME_SINGLE = 'run.json';
export const FILENAME_COMPARISON = 'comparison_data.json';
export const MOUNT_PATH_TO_E2E_DATA = 'piperider-getting-started/.piperider';
export const PATH_TO_SINGLE_REPORT_DATA_JSON =
  '../' +
  (isE2E ? `${MOUNT_PATH_TO_E2E_DATA}` : `.piperider`) +
  `/outputs/latest/${FILENAME_SINGLE}`;
export const PATH_TO_METADATA_DATA_JSON = 'piperider-metadata.json';
export const PATH_TO_SCHEMA_JSON = `../piperider_cli/profiler/schema.json`;
