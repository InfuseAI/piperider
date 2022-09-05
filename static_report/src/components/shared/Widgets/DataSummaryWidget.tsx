import { Box, Divider, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { renderChartUnavailableMsg } from '../../../utils/charts';
import { formatTitleCase } from '../../../utils/formatters';
import { NO_VALUE } from '../Columns/constants';
import { SRSummaryStats } from '../Columns/ColumnMetrics/SRSummaryStats';

interface Props {
  columnDatum?: ColumnSchema;
}
/**
 * A widget that displays a block of metrics related to avg, stddev, etc
 * Will render empty-state when columnDatum is falsey
 */
export function DataSummaryWidget({ columnDatum }: Props) {
  if (columnDatum) {
    return (
      <Box>
        <Text fontSize={'xl'}>
          {formatTitleCase(columnDatum?.type || NO_VALUE)} Statistics
        </Text>
        <Divider my={3} />
        <SRSummaryStats columnDatum={columnDatum} width={'100%'} />
      </Box>
    );
  }
  return <>{renderChartUnavailableMsg()}</>;
}
