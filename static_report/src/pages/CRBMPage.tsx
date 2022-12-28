import { Grid } from '@chakra-ui/react';
import { Main } from '../components/Common/Main';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { ComparisonReportSchema } from '../types';
import { AMPLITUDE_EVENTS, CR_TYPE_LABEL, useReportStore } from '../utils';

interface Props {
  data: ComparisonReportSchema;
}
export function CRBMPage({ data: { base, input } }: Props) {
  useDocumentTitle('Comparison Report: Business Metrics');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'business-metrics-page',
    },
  });
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base, input });
  const { BMOnly } = useReportStore.getState();
  return (
    <Main isSingleReport={false}>
      <Grid>This is a business metrics page (CR)</Grid>
    </Main>
  );
}
