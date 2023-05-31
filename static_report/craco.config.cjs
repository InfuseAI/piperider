const CracoEsbuildPlugin = (async () => await import('craco-esbuild'))();
const event = process.env.npm_lifecycle_event;

if (event === 'serve:single' || event === 'serve:comparison') {
  const { readFileSync, existsSync } = require('fs');
  const { resolve } = require('path');
  const FILENAME_SINGLE = 'run.json';
  const FILENAME_COMPARISON = 'comparison_data.json';

  const report_type = event.split(':')[1];
  process.env.REACT_APP_SINGLE_REPORT_DATA_JSON = {};
  process.env.REACT_APP_COMPARISON_REPORT_DATA_JSON = {};

  // Load report data from current directory
  if (report_type === 'single') {
    const singleReportPath = resolve(FILENAME_SINGLE);
    if (existsSync(singleReportPath)) {
      process.env.REACT_APP_SINGLE_REPORT_DATA_JSON = JSON.stringify(
        JSON.parse(Buffer.from(readFileSync(singleReportPath, 'utf8'))),
      );
    }
  } else if (report_type === 'comparison') {
    const comparisonReportPath = resolve(FILENAME_COMPARISON);
    if (existsSync(comparisonReportPath)) {
      process.env.REACT_APP_COMPARISON_REPORT_DATA_JSON = JSON.stringify(
        JSON.parse(Buffer.from(readFileSync(comparisonReportPath, 'utf8'))),
      );
    }
  }
}

module.exports = {
  plugins: [{ plugin: CracoEsbuildPlugin }],
};
