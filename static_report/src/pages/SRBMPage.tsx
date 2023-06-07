import { Box, Grid, GridItem, Text } from '@chakra-ui/react';
import _ from 'lodash';
import { zip } from 'lodash';
import { useRoute } from 'wouter';
import { NoData } from '../components';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useTrackOnMount } from '../hooks';
import { EVENTS, SR_TYPE_LABEL, useReportStore } from '../utils';
import { METRIC_DETAILS_ROUTE_PATH } from '../utils/routes';

export function SRBMPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'metrics-page',
    },
  });

  const { tableColumnsOnly, rawData } = useReportStore.getState();
  const [matchMetric, paramMetric] = useRoute(METRIC_DETAILS_ROUTE_PATH);

  let queries = rawData?.base?.metrics ?? [];

  if (matchMetric) {
    const uniqueId = paramMetric?.uniqueId;
    const entry = _.find(tableColumnsOnly, ([key]) => key === uniqueId);
    if (entry) {
      const [, { base, target }] = entry;
      queries = base?.__queries || [];
    }
  }

  const names = queries.map((v) => v.name);
  return (
    <Box>
      <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
        Metrics
      </Text>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} w={'100%'} gap={5}>
        {names.map((name) => {
          //NOTE: find required as indexes are not reliable to match CR+BM pairs
          const query = queries.find((q) => q.name === name);

          return (
            <GridItem key={name}>
              <BMWidget data={{ base: query }} singleOnly />
            </GridItem>
          );
        })}
        {names.length === 0 && <NoData text="No metrics data available" />}
      </Grid>
    </Box>
  );
}
