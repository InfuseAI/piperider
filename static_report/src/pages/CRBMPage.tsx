import { Box, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { NoData, NO_VALUE } from '../components';
import { Main } from '../components/Common/Main';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { BusinessMetric, ComparisonReportSchema } from '../types';
import {
  AMPLITUDE_EVENTS,
  CR_TYPE_LABEL,
  mainContentAreaHeight,
  useReportStore,
} from '../utils';

interface Props {
  data: ComparisonReportSchema;
}
export function CRBMPage({ data: { base, input } }: Props) {
  useDocumentTitle('Comparison Report: Business Metrics');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'business-metrics-page',
    },
  });
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base, input });
  const { BMOnly, rawData, tableColumnsOnly = [] } = useReportStore.getState();

  const datasource =
    input?.datasource.name ?? base?.datasource.name ?? NO_VALUE;

  //NOTE: target will override base BM's
  const BMList: BusinessMetric[] = BMOnly?.target ?? BMOnly?.base ?? [];

  return (
    <Main isSingleReport={false}>
      <MasterDetailContainer
        rawData={rawData}
        tableColEntries={tableColumnsOnly}
      >
        <Box px={9} h={mainContentAreaHeight} overflowY={'auto'}>
          <Flex w={'100%'} p={5}>
            <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
              Report Business Metrics ({datasource})
            </Text>
          </Flex>
          <Grid templateColumns={'1fr 1fr'} w={'100%'} gap={5} p={5}>
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
              <GridItem colSpan={2} background={'gray.200'} p={5}>
                <NoData text="No Business Metrics Data Available" />
              </GridItem>
            )}
          </Grid>
        </Box>
      </MasterDetailContainer>
    </Main>
  );
}
