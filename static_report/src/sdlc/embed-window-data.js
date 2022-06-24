import { parse } from 'node-html-parser';
import { readdir, readFile, writeFile } from 'fs/promises';
import chalk from 'chalk';

/**
 * Inserts piperider report data into public/index.html
 * Note: This is for DEVELOPMENT ONLY. Make sure to exclude/revert index.html changes before pushing and committing!
 */
const insertDataToHTML = async () => {
  try {
    const latestCompare = (await readdir('../.piperider/comparisons')).pop();
    const PATH_TO_INDEX = 'public/index.html';
    const PATH_REF_LOOKUP = {
      single: '../.piperider/outputs/latest/run.json',
      comparison: `../.piperider/comparisons/${latestCompare}/comparison_data.json`,
    };
    const log = console.log;

    // Read Latest Existing Report Data (Comparison/Single)
    const validReportData = new Map();
    Object.entries(PATH_REF_LOOKUP).forEach(
      async ([reportType, pathToReport]) => {
        log(chalk.blueBright(`Searching latest ${reportType}... `));
        const jsonData = JSON.parse(
          Buffer.from(
            await readFile(pathToReport, {
              encoding: 'utf-8',
            }),
          ),
        );

        if (jsonData) {
          validReportData.set(reportType, jsonData);
          log(
            chalk.green(
              `Loading...${
                reportType === 'single'
                  ? `latest(${reportType})`
                  : `${latestCompare}(${reportType})`
              }`,
            ),
          );
        } else {
          log(
            chalk.yellow(
              `Failed to load: ${reportType}. Check if you have the output reports in your .piperider/ directory`,
            ),
          );
        }
      },
    );

    // Insert Report Data to HTML
    const html = parse(Buffer.from(await readFile(PATH_TO_INDEX)).toString());
    html.querySelector('#piperider-report-variables').textContent = `
        // single report
        window.PIPERIDER_SINGLE_REPORT_DATA = ${JSON.stringify(
          validReportData.get('single') || '',
        )};
        // compare report
        window.PIPERIDER_COMPARISON_REPORT_DATA = ${JSON.stringify(
          validReportData.get('comparison') || '',
        )};
    `;
    console.log(chalk.green(`Embedded data to HTML: ${PATH_TO_INDEX}`));
    await writeFile(PATH_TO_INDEX, html.toString());
  } catch (error) {
    console.error(error);
  }
};

insertDataToHTML();
