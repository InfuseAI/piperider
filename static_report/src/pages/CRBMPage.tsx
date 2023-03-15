import { Box, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { NoData } from '../components';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useTrackOnMount } from '../hooks';
import { BusinessMetric } from '../types';
import { EVENTS, CR_TYPE_LABEL, useReportStore } from '../utils';

export function CRBMPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'metrics-page',
    },
  });
  const { BMOnly } = useReportStore.getState();

  //NOTE: target will override base BM's
  const BMList: BusinessMetric[] = BMOnly?.target ?? BMOnly?.base ?? [];

  return (
    <Box>
      <Flex w={'100%'}>
        <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
          Metrics
        </Text>
      </Flex>
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} w={'100%'} gap={5}>
        {BMList.map((v, i) => {
          //NOTE: find required as indexes are not reliable to match CR+BM pairs
          const base = BMOnly?.base?.find((d) => d.name === v.name);
          return (
            <GridItem key={v.name}>
              <BMWidget data={{ base, target: BMOnly?.target?.[i] }} />
            </GridItem>
          );
        })}
        {BMList.length === 0 && (
          <GridItem colSpan={2} background={'gray.200'} p={5} minH={'50vh'}>
            <NoData text="No Metrics Data Available" />
          </GridItem>
        )}
      </Grid>
    </Box>
  );
}
