import { Box, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import _, { zip } from 'lodash';
import { useRoute } from 'wouter';
import { NoData } from '../components';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useTrackOnMount } from '../hooks';
import { BusinessMetric } from '../types';
import { EVENTS, CR_TYPE_LABEL, useReportStore } from '../utils';
import { METRIC_DETAILS_ROUTE_PATH } from '../utils/routes';

export function CRBMPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'metrics-page',
    },
  });
  const { tableColumnsOnly, rawData } = useReportStore.getState();
  const [matchMetric, paramMetric] = useRoute(METRIC_DETAILS_ROUTE_PATH);

  let baseQueries = rawData?.base?.metrics ?? [];
  let targetQueries = rawData?.input?.metrics ?? [];

  if (matchMetric) {
    const uniqueId = paramMetric?.uniqueId;
    const entry = _.find(tableColumnsOnly, ([key]) => key === uniqueId);
    if (entry) {
      const [, { base, target }] = entry;
      baseQueries = base?.__queries || [];
      targetQueries = target?.__queries || [];
    }
  }

  const names = _.uniq([
    ...targetQueries.map((v) => v.name),
    ...baseQueries.map((v) => v.name),
  ]);

  return (
    <Box>
      <Flex w={'100%'}>
        <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
          Metrics
        </Text>
      </Flex>
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} w={'100%'} gap={5}>
        {names.map((name) => {
          //NOTE: find required as indexes are not reliable to match CR+BM pairs
          const base = baseQueries.find((q) => q.name === name);
          const target = targetQueries.find((q) => q.name === name);
          return (
            <GridItem key={name}>
              <BMWidget data={{ base, target }} />
            </GridItem>
          );
        })}
        {names.length === 0 && <NoData text="No metrics data available" />}
      </Grid>
    </Box>
  );
}
