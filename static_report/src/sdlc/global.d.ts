import { ComparisonReportSchema } from '../../comparison-report-schema.d';
import { SingleReportSchema } from '../../single-report-schema.d';

declare global {
  interface Window {
    PIPERIDER_SINGLE_REPORT_DATA: SingleReportSchema;
    PIPERIDER_COMPARISON_REPORT_DATA: ComparisonReportSchema;
  }
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_SINGLE_REPORT: string;
    }
  }
}
export {};
