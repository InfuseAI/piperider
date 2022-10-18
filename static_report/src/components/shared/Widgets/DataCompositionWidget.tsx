import { Divider, Text, Box } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { renderChartUnavailableMsg } from '../Charts/utils';
import { FlatStackedBarChart } from '../Charts/FlatStackedBarChart';
import { GeneralStats } from '../Columns/ColumnMetrics/GeneralStats';
import { TypedStats } from '../Columns/ColumnMetrics/TypedStats';
import { transformCompositionAsFlatStackInput } from '../Columns/utils';

interface Props {
  hasAnimation?: boolean;
  columnDatum?: ColumnSchema;
}
export function DataCompositionWidget({ columnDatum, hasAnimation }: Props) {
  const dataCompInput = transformCompositionAsFlatStackInput(columnDatum);

  const animationOptions = hasAnimation ? {} : false;

  if (dataCompInput) {
    return (
      <Box mb={6}>
        <Text fontSize={'xl'}>Data Composition</Text>
        <Divider my={3} />
        <Box h={`4em`}>
          <FlatStackedBarChart
            data={dataCompInput}
            animation={animationOptions}
          />
        </Box>
        <Box mt={3}>
          <GeneralStats
            baseColumnDatum={columnDatum}
            singleOnly
            width={'100%'}
          />
          <TypedStats baseColumnDatum={columnDatum} singleOnly width={'100%'} />
        </Box>
      </Box>
    );
  }
  return <>{renderChartUnavailableMsg({})}</>;
}
