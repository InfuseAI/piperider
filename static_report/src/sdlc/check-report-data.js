import { existsSync, copyFileSync } from 'fs';
import {
  isE2E,
  FILENAME_SINGLE,
  FILENAME_COMPARISON,
  PATH_TO_SINGLE_REPORT_DATA_JSON,
  getComparisonDataPath,
} from './core.js';

const checkSingleReportData = async () => {
  if (existsSync(FILENAME_SINGLE)) {
    console.log(`Found ${FILENAME_SINGLE} in current directory`);
    return true;
  }

  try {
    // Copy single report data from .piperider
    if (existsSync(PATH_TO_SINGLE_REPORT_DATA_JSON)) {
      copyFileSync(PATH_TO_SINGLE_REPORT_DATA_JSON, FILENAME_SINGLE);
      return true;
    }
  } catch (error) {}

  console.error(
    `No ${FILENAME_SINGLE} found in current directory or .piperider`,
  );
  return false;
};

const checkComparisonReportData = async () => {
  if (existsSync(FILENAME_COMPARISON)) {
    console.log(`Found ${FILENAME_COMPARISON} in current directory`);
    return true;
  }

  // Copy comparison report data from .piperider
  try {
    const PATH_TO_COMPARISON_REPORT_DATA_JSON = await getComparisonDataPath(
      isE2E,
    );
    if (existsSync(PATH_TO_COMPARISON_REPORT_DATA_JSON)) {
      copyFileSync(PATH_TO_COMPARISON_REPORT_DATA_JSON, FILENAME_COMPARISON);
      return true;
    }
  } catch (error) {}

  console.error(
    `No ${FILENAME_COMPARISON} found in current directory or .piperider`,
  );
  return false;
};

const checkReportData = async () => {
  await checkSingleReportData();
  await checkComparisonReportData();
};

checkReportData();
