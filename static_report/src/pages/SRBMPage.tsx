import { Box, Grid, GridItem, Text } from '@chakra-ui/react';
import { NoData } from '../components';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { AMPLITUDE_EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';

export function SRBMPage() {
  useDocumentTitle('Single Report: Metrics');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'business-metrics-page',
    },
  });
  const { BMOnly } = useReportStore.getState();

  return (
    <Box>
      <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
        Metrics
      </Text>

      <Grid templateColumns={'1fr 1fr'} w={'100%'} minH={'50%'} gap={5}>
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
