import { Grid } from '@chakra-ui/react';
import { Main } from '../components/Common/Main';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { SaferSRSchema } from '../types';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';

interface Props {
  data: SaferSRSchema;
}
export function SRBMPage({ data }: Props) {
  useDocumentTitle('Single Report: Business Metrics');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'business-metrics-page',
    },
  });
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base: data });
  // const { assertionsOnly } = useReportStore.getState();
  return (
    <Main isSingleReport>
      <Grid>This is a business metrics page (SR)</Grid>
    </Main>
  );
}
