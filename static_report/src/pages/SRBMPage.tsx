import { Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { NO_VALUE } from '../components';
import { BMLineChart } from '../components/Charts/BMLineChart';
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
  const {
    BMOnly,
    rawData: { base, input },
  } = useReportStore.getState();
  const datasource =
    input?.datasource.name ?? base?.datasource.name ?? NO_VALUE;
  const BMList = BMOnly?.base ?? [];

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
          <GridItem key={v.name}>
            <Flex
              className="widget-header"
              py={5}
              justifyContent={'space-between'}
            >
              <Text fontWeight={'medium'}>{v.name}</Text>
            </Flex>
            <Flex maxH={'300px'} justifyContent={'center'}>
              {/* TODO: Handle Comparable CR data */}
              <BMLineChart data={v} />
            </Flex>
          </GridItem>
        ))}
      </Grid>
    </Main>
  );
}
