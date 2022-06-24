import GS from 'generate-schema';
import chalk from 'chalk';
import {
  COMPARISON_KEY,
  generateFile,
  getComparisonDataPath,
  getFileData,
  log,
  PATH_TO_SINGLE_REPORT_DATA_JSON,
  SINGLE_KEY,
} from './core.js';

const flag = process.argv[2];
const isSingle = flag === SINGLE_KEY;
const fileName = `src/sdlc/${
  isSingle ? SINGLE_KEY : COMPARISON_KEY
}-report-schema.json`;

const generateReportSchema = async () => {
  log(chalk.blueBright(`Generating Report Schema...`));
  log(chalk.blueBright(`[ Type: ${isSingle ? SINGLE_KEY : COMPARISON_KEY} ]`));

  const PATH_TO_REPORT = isSingle
    ? PATH_TO_SINGLE_REPORT_DATA_JSON
    : await getComparisonDataPath();

  const jsonData = await getFileData(PATH_TO_REPORT);
  const jsonSchema = JSON.stringify(GS.json(jsonData));
  await generateFile(fileName, jsonSchema);
};
generateReportSchema();
