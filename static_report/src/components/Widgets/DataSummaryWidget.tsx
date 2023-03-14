import { Box, Divider, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { renderChartUnavailableMsg } from '../Charts/utils';
import { formatTitleCase } from '../../utils/formatters';
import { SummaryStats } from '../Columns/ColumnMetrics/SummaryStats';

interface Props {
  columnDatum?: ColumnSchema;
}
/**
 * A widget that displays a block of metrics related to avg, stddev, etc
 * Will render empty-state when columnDatum is falsey
 */
export function DataSummaryWidget({ columnDatum }: Props) {
  return (
    <Box width="100%">
      <Text fontSize={'xl'}>
        {columnDatum ? formatTitleCase(columnDatum?.type) : 'Type '} Statistics
      </Text>
      <Divider my={1} />
      {columnDatum ? (
        <SummaryStats columnDatum={columnDatum} width={'100%'} />
      ) : (
        renderChartUnavailableMsg({})
      )}
    </Box>
  );
}
