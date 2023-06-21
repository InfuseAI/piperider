import { Box, Flex, Grid, GridItem, Link, Text } from '@chakra-ui/react';
import _ from 'lodash';
import { FaChartBar } from 'react-icons/fa';
import { useRoute } from 'wouter';
import { TableColumnHeader } from '../components';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useTrackOnMount } from '../hooks';
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
  let name = 'All metrics';
  let description = 'All metric queries';

  if (matchMetric) {
    const uniqueId = paramMetric?.uniqueId;
    const entry = _.find(tableColumnsOnly, ([key]) => key === uniqueId);
    if (entry) {
      const [, { base, target }] = entry;
      const fallback = target ?? base;
      baseQueries = base?.__queries || [];
      targetQueries = target?.__queries || [];
      name = fallback?.label ?? fallback?.name;
      description = fallback?.description;
    }
  }

  const names = _.uniq([
    ...targetQueries.map((v) => v.name),
    ...baseQueries.map((v) => v.name),
  ]);

  return (
    <Box>
      <Flex w={'100%'}>
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
