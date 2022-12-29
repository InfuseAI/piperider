import { Grid, GridItem, Text } from '@chakra-ui/react';
import { NO_VALUE } from '../components';
import { Main } from '../components/Common/Main';
import { BMWidget } from '../components/Widgets/BMWidget';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { ComparableData, ComparisonReportSchema } from '../types';
import {
  AMPLITUDE_EVENTS,
  CR_TYPE_LABEL,
  DBTBusinessMetricGroupItem,
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
  const { BMOnly } = useReportStore.getState();
  const datasource =
    input?.datasource.name ?? base?.datasource.name ?? NO_VALUE;

  //NOTE: target will override base BM's
  const BMList: DBTBusinessMetricGroupItem[] =
    BMOnly?.target ?? BMOnly?.base ?? [];
  return (
    <Main isSingleReport={false}>
      <Grid templateColumns={'1fr 1fr'} w={'100%'} gap={5} p={5}>
        <GridItem colSpan={2}>
          <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
            Report Business Metrics ({datasource})
          </Text>
        </GridItem>
        {BMList.map((v, i) => (
          <GridItem key={v.name}>
            <BMWidget
              data={{ base: BMOnly?.base?.[i], target: BMOnly?.target?.[i] }}
              singleOnly
            />
          </GridItem>
        ))}
      </Grid>
    </Main>
  );
}
