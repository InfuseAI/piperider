import chalk from 'chalk';
import { writeFile, readdir, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { parse } from 'node-html-parser';

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
    log(chalk.yellow(`Reading path: ${pathToReport}`));
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
export const PIPERIDER_VERSION = readFileSync('../piperider_cli/VERSION')
  .toString()
  .replace('\n', '');
