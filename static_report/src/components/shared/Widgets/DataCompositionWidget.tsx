import { Divider, Text, Box } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { Comparable } from '../../../types';
import { renderChartUnavailableMsg } from '../Charts/utils';
import { formatTitleCase } from '../../../utils/formatters';
import { FlatStackedBarChart } from '../Charts/FlatStackedBarChart';
import { GeneralStats } from '../Columns/ColumnMetrics/GeneralStats';
import { TypedStats } from '../Columns/ColumnMetrics/TypedStats';
import {
  containsAvgSDSummary,
  transformCompositionAsFlatStackInput,
} from '../Columns/utils';

interface Props extends Comparable {
  hasAnimation?: boolean;
  columnDatum?: ColumnSchema;
}
export function DataCompositionWidget({
  columnDatum,
  hasAnimation,
  singleOnly,
}: Props) {
  const { type } = columnDatum || {};
  const showGenericTypeComp = containsAvgSDSummary(type);
  const dataCompInput = transformCompositionAsFlatStackInput(
    columnDatum,
    'static',
  );
  const dynamicCompInput = transformCompositionAsFlatStackInput(
    columnDatum,
    'dynamic',
  );
  const animationOptions = hasAnimation ? {} : false;
  if (dataCompInput) {
    return (
      <Box>
        <Box mb={6}>
          <Text fontSize={'xl'}>Data Composition</Text>
          <Divider my={3} />
          <Box height={'55px'}>
            <FlatStackedBarChart
              data={dataCompInput}
              animation={animationOptions}
            />
          </Box>
          <Box mt={6}>
            <GeneralStats
              baseColumnDatum={columnDatum}
              singleOnly
              width={'100%'}
            />
          </Box>
        </Box>

        {showGenericTypeComp && dynamicCompInput && (
          <Box>
            <Text fontSize={'xl'}>{formatTitleCase(type)} Composition</Text>
            <Divider my={3} />
            <Box height={'55px'}>
              <FlatStackedBarChart
                data={dynamicCompInput}
                animation={animationOptions}
              />
            </Box>
            <Box mt={6}>
              <TypedStats
                baseColumnDatum={columnDatum}
                singleOnly
                width={'100%'}
              />
            </Box>
          </Box>
        )}
      </Box>
    );
  }
  return <>{renderChartUnavailableMsg()}</>;
}
