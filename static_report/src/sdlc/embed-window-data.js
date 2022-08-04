import chalk from 'chalk';
import {
  COMPARISON_KEY,
  generateFile,
  getComparisonDataPath,
  getEmbeddedIndexHTML,
  getFileData,
  isE2E,
  log,
  PATH_TO_INDEX,
  PATH_TO_SINGLE_REPORT_DATA_JSON,
  SINGLE_KEY,
} from './core.js';

/**
 * Inserts piperider report data into public/index.html
 * Note: This is for DEVELOPMENT ONLY. Make sure to exclude/revert index.html changes before pushing and committing!
 */
const insertDataToHTML = async () => {
  // NOTE: Not exported from core.js due to call-assign pattern, leading to unexpected errors when initializing imported file value
  const PATH_TO_COMPARISON_REPORT_DATA_JSON = await getComparisonDataPath(
    isE2E,
  );
  const reportDataMap = new Map();

  await setMapValues(
    reportDataMap,
    PATH_TO_SINGLE_REPORT_DATA_JSON,
    SINGLE_KEY,
  );

  await setMapValues(
    reportDataMap,
    PATH_TO_COMPARISON_REPORT_DATA_JSON,
    COMPARISON_KEY,
  );

  // Embed Report Data to HTML and Rewrite
  const embedHtml = await getEmbeddedIndexHTML(reportDataMap);
  await generateFile(PATH_TO_INDEX, embedHtml.toString());
};

const setMapValues = async (dataMap, pathToReport, reportType) => {
  const jsonDataComparison = await getFileData(pathToReport);
  dataMap.set(reportType, jsonDataComparison);

  log(chalk.yellow(`Loading data from:${pathToReport}`));
};

insertDataToHTML();
