import { Grid, GridItem, Text } from '@chakra-ui/react';
import { Main } from '../components/Common/Main';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { SaferSRSchema } from '../types';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';

const MOCK_BM_LIST = [
  {
    name: 'Daily',
    params: {
      dimensions: [],
      grain: 'day',
    },
    headers: ['day', 'active_user'],
    data: [
      ['2012-12-01', 1],
      ['2012-12-02', 1],
      ['2012-12-03', 1],
      ['2012-12-04', 1],
    ],
  },
  {
    name: 'Weekly',
    params: {
      dimensions: [],
      grain: 'week',
    },
    headers: ['day', 'active_user'],
    data: [
      ['2012-12-01', 1],
      ['2012-12-08', 2],
      ['2012-12-15', 3],
      ['2012-12-22', 4],
    ],
  },
  {
    name: 'Monthly',
    params: {
      dimensions: [],
      grain: 'month',
    },
    headers: ['day', 'active_user'],
    data: [
      ['2012-12-01', 10],
      ['2013-01-01', 20],
      ['2013-02-01', 30],
      ['2013-03-01', 40],
    ],
  },
  {
    name: 'Yearly',
    params: {
      dimensions: [],
      grain: 'year',
    },
    headers: ['day', 'active_user'],
    data: [
      ['2012-12-01', 10],
      ['2013-12-01', 20],
      ['2014-12-01', 30],
      ['2015-12-01', 40],
    ],
  },
];
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
  const { BMOnly } = useReportStore.getState();
  const BMList = BMOnly?.base || [];
  return (
    <Main isSingleReport>
      <Text fontSize={'xl'}>This is a business metrics page (SR)</Text>
      <Grid>
        {BMList.map((v) => (
          <GridItem>{v.name}</GridItem>
        ))}
      </Grid>
    </Main>
  );
}
