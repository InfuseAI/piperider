import chalk from 'chalk';
import {
  COMPARISON_KEY,
  generateFile,
  getComparisonDataPath,
  getEmbeddedIndexHTML,
  getFileData,
  getMetadata,
  isE2E,
  log,
  PATH_TO_INDEX,
  PATH_TO_SINGLE_REPORT_DATA_JSON,
  SINGLE_KEY,
  PATH_TO_METADATA_DATA_JSON,
  METADATA_KEY,
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

  // Read Report Data (Comparison/Single)
  log(PATH_TO_SINGLE_REPORT_DATA_JSON);
  log(PATH_TO_COMPARISON_REPORT_DATA_JSON);

  // Set PipeRider Metadata
  const metadata = await getMetadata();
  log(metadata);
  await generateFile(PATH_TO_METADATA_DATA_JSON, JSON.stringify(metadata));

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

  await setMapValues(reportDataMap, PATH_TO_METADATA_DATA_JSON, METADATA_KEY);

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
