import { Box, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { NoData, NO_VALUE } from '../components';
import { Main } from '../components/Common/Main';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { SaferSRSchema } from '../types';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';

interface Props {
  data: SaferSRSchema;
}
export function SRBMPage({ data }: Props) {
  useDocumentTitle('Single Report: Metrics');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'business-metrics-page',
    },
  });
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base: data });
  const { BMOnly, rawData, tableColumnsOnly = [] } = useReportStore.getState();
  const datasource = data?.datasource.name ?? NO_VALUE;

  return (
    <Box>
      <Flex w={'100%'} p={5}>
        <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
          Report Metrics ({datasource})
        </Text>
      </Flex>
      <Grid templateColumns={'1fr 1fr'} w={'100%'} minH={'50%'} gap={5} p={5}>
        {(BMOnly?.base ?? []).map((v) => (
          <GridItem key={v.name}>
            <BMWidget data={{ base: v }} singleOnly />
          </GridItem>
        ))}
        {!BMOnly?.base?.length && (
          <GridItem colSpan={2} background={'gray.200'} p={5} minH={'50vh'}>
            <NoData text="No Metrics Data Available" />
          </GridItem>
        )}
      </Grid>
    </Box>
  );
}
