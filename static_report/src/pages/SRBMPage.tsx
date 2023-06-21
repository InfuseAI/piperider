import { Box, Grid, GridItem, Link, Text } from '@chakra-ui/react';
import _ from 'lodash';
import { FaChartBar } from 'react-icons/fa';
import { useRoute } from 'wouter';
import { TableColumnHeader } from '../components';
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
  let name = 'All metrics';
  let description = 'All metric queries';

  if (matchMetric) {
    const uniqueId = paramMetric?.uniqueId;
    const entry = _.find(tableColumnsOnly, ([key]) => key === uniqueId);
    if (entry) {
      const [, { base }] = entry;
      queries = base?.__queries || [];
      name = base?.label ?? base?.name;
      description = base?.description;
    }
  }

  const names = queries.map((v) => v.name);
  return (
    <Box>
      {!matchMetric && (
        <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
          Metrics
        </Text>
      )}
      {matchMetric && (
        <TableColumnHeader
          subtitle="Metric"
          title={name}
          icon={FaChartBar}
          infoTip={description}
        />
      )}

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
        {names.length === 0 && (
          <Text color="gray.500">
            No metric queries available. To enable, see{' '}
            <Link
              isExternal
              textDecoration={'underline'}
              href="https://docs.piperider.io/get-started/run/metrics"
            >
              metrics docs
            </Link>
          </Text>
        )}
      </Grid>
    </Box>
  );
}
