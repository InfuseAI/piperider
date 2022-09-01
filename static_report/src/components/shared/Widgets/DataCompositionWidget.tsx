import { Divider, Text, Box } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { renderChartUnavailableMsg } from '../../../utils/charts';
import { formatTitleCase } from '../../../utils/formatters';
import {
  containsAvgSDSummary,
  transformCompositionAsFlatStackInput,
} from '../../../utils/transformers';
import { FlatStackedBarChart } from '../Charts/FlatStackedBarChart';
import { SRGeneralStats } from '../Columns/ColumnMetrics/SRGeneralStats';
import { SRTextNumberStats } from '../Columns/ColumnMetrics/SRTextNumberStats';

interface Props {
  columnDatum?: ColumnSchema;
}
export function DataCompositionWidget({ columnDatum }: Props) {
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
  if (dataCompInput) {
    return (
      <Box>
        <Box mb={6}>
          <Text fontSize={'xl'}>Data Composition</Text>
          <Divider my={3} />
          <Box height={'55px'}>
            <FlatStackedBarChart data={dataCompInput} />
          </Box>
          <Box mt={6}>
            <SRGeneralStats columnDatum={columnDatum} width={'100%'} />
          </Box>
        </Box>

        {showGenericTypeComp && dynamicCompInput && (
          <Box>
            <Text fontSize={'xl'}>{formatTitleCase(type)} Composition</Text>
            <Divider my={3} />
            <Box height={'55px'}>
              <FlatStackedBarChart data={dynamicCompInput} />
            </Box>
            <Box mt={6}>
              <SRTextNumberStats columnDatum={columnDatum} width={'100%'} />
            </Box>
          </Box>
        )}
      </Box>
    );
  }
  return <>{renderChartUnavailableMsg()}</>;
}
