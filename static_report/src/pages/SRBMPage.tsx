import { Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { NO_VALUE } from '../components';
import { BMLineChart } from '../components/Charts/BMLineChart';
import { Main } from '../components/Common/Main';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { SaferSRSchema } from '../types';
import {
  AMPLITUDE_EVENTS,
  borderVal,
  SR_TYPE_LABEL,
  useReportStore,
} from '../utils';

const MOCK_BM_LIST = [
  {
    name: 'Daily',
    params: {
      dimensions: [],
      grain: 'day',
    },
    headers: ['day', 'active_user'],
    data: [
      ['2012-12-01', 1], // <-- is data[0] always datetime str?
      ['2012-12-02', 2],
      ['2012-12-03', 3],
      ['2012-12-04', 4],
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
      ['2012-12-01', 0],
      ['2012-12-08', 5],
      ['2012-12-15', 3],
      ['2012-12-22', 7],
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
      ['2013-02-01', 40],
      ['2013-03-01', 80],
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
      ['2012-12-01', 0],
      ['2013-12-01', 10],
      ['2014-12-01', 100],
      ['2015-12-01', -40],
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
  const {
    BMOnly,
    rawData: { base, input },
  } = useReportStore.getState();
  const datasource =
    input?.datasource.name ?? base?.datasource.name ?? NO_VALUE;
  const BMList = BMOnly?.base || MOCK_BM_LIST;
  return (
    <Main isSingleReport>
      <Grid templateColumns={'1fr 1fr'} w={'100%'} gap={5} p={5}>
        <GridItem colSpan={2}>
          <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
            Report Business Metrics ({datasource})
          </Text>
        </GridItem>
        {BMList.map((v) => (
          // TODO: Convert into Widget later (when adding filters for time-grain + dimensions + other chart visuals)
          <GridItem key={v.name} border={borderVal}>
            <Flex className="widget-header">
              <Text fontWeight={'medium'}>{v.name}</Text>
            </Flex>
            <Flex>
              <BMLineChart data={v} />
            </Flex>
          </GridItem>
        ))}
      </Grid>
    </Main>
  );
}
