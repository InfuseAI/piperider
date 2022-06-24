import chalk from 'chalk';
import { writeFile, readdir, readFile } from 'fs/promises';
import { parse } from 'node-html-parser';

export const log = console.log;
export const SINGLE_KEY = 'single';
export const COMPARISON_KEY = 'comparison';
export const PATH_TO_INDEX = 'public/index.html';
export const PATH_TO_SINGLE_REPORT_DATA_JSON =
  '../.piperider/outputs/latest/run.json';

export const generateFile = async (fileName, fileData) => {
  try {
    await writeFile(fileName, fileData);
    log(chalk.green(`Created file: ${fileName}`));
  } catch (e) {
    throw new Error(chalk.red(e, `Check if file data exists!`));
  }
};
export const getComparisonDataPath = async () => {
  const reportName = (await readdir('../.piperider/comparisons')).pop();
  return `../.piperider/comparisons/${reportName}/comparison_data.json`;
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
