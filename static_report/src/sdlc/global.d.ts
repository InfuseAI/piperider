import { ComparisonReportSchema } from 'comparison-report-schema.d';
import { SingleReportSchema } from 'single-report-schema.d';

declare global {
  interface PipeRiderMetadata {
    name: string;
    sentry_dns: string;
    sentry_env: string;
    version: string;
    amplitude_api_key: string;
    amplitude_user_id: string;
    amplitude_project_id: string;
  }
  interface Window {
    PIPERIDER_SINGLE_REPORT_DATA: SingleReportSchema;
    PIPERIDER_COMPARISON_REPORT_DATA: ComparisonReportSchema;
    PIPERIDER_METADATA: PipeRiderMetadata;
  }
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_SINGLE_REPORT: string;
    }
  }
}
export {};
