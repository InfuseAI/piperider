import { Box } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { renderChartUnavailableMsg } from '../Charts/utils';
import { FlatBoxPlotChart } from '../Charts/FlatBoxPlotChart';
import { QuantilesMatrix } from '../Columns/ColumnMetrics/QuantilesMatrix';

interface Props {
  columnDatum?: ColumnSchema;
}
export function QuantilesWidget({ columnDatum }: Props) {
  const { p50, max, min, p25, p75 } = columnDatum || {};
  return (
    <Box minWidth={'0px'} width="100%">
      {columnDatum ? (
        <>
          <Box>
            <FlatBoxPlotChart
              quantileData={{
                p50,
                max,
                min,
                p25,
                p75,
              }}
            />
          </Box>
          <QuantilesMatrix columnDatum={columnDatum} />
        </>
      ) : (
        renderChartUnavailableMsg({})
      )}
    </Box>
  );
}
