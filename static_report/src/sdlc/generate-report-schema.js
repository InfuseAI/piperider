import { readdir, readFile, writeFile } from 'fs/promises';
import GS from 'generate-schema';
import chalk from 'chalk';

const flag = process.argv[2];
const log = console.log;
const isSingle = flag === 'single';

const generateReportSchema = async () => {
  log(chalk.blueBright(`Generating Report Schema...`));
  log(chalk.blueBright(`Type: ${isSingle ? 'single' : 'comparison'}`));

  const latestCompare =
    !isSingle && (await readdir('../.piperider/comparisons')).pop();

  const PATH_TO_REPORT = isSingle
    ? '../.piperider/outputs/latest/run.json'
    : `../.piperider/comparisons/${latestCompare}/comparison_data.json`;

  log(chalk.yellow(`reading report path: ${PATH_TO_REPORT}...`));
  const jsonData = JSON.parse(
    Buffer.from(
      await readFile(PATH_TO_REPORT, {
        encoding: 'utf-8',
      }),
    ),
  );
  const jsonSchema = JSON.stringify(GS.json(jsonData));
  const fileName = `${isSingle ? 'single' : 'comparison'}-report-schema.json`;
  await writeFile(fileName, jsonSchema);

  log(chalk.green(`Created file ${fileName}`));
};
generateReportSchema();
