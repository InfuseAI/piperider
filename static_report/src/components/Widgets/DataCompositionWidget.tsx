import { Divider, Text, Box, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
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

  return (
    <Flex direction={'column'} pb={6}>
      <Text fontSize={'xl'}>Data Composition</Text>
      <Divider my={3} />
      <Box h={`4em`} flexGrow={1}>
        {dataCompInput ? (
          <FlatStackedBarChart
            data={dataCompInput}
            animation={animationOptions}
          />
        ) : (
          renderChartUnavailableMsg({})
        )}
      </Box>
      <Box>
        <GeneralStats columnDatum={columnDatum} width={'100%'} />
        <TypedStats columnDatum={columnDatum} width={'100%'} />
      </Box>
    </Flex>
  );
}
