import { Divider, Text, Box } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { formatTitleCase } from '../../../utils/formatters';
import { transformCompositionAsFlatStackInput } from '../../../utils/transformers';
import { FlatStackedBarChart } from '../Charts/FlatStackedBarChart';
import { SRGeneralColumnMetrics } from '../ColumnMetrics/SRGeneralColumnMetrics';
import { SRTextNumberStats } from '../ColumnMetrics/SRTextNumberStats';

interface Props {
  columnDatum?: ColumnSchema;
}
export function DataCompositionWidget({ columnDatum }: Props) {
  const { type } = columnDatum || {};
  const showGenericTypeComp =
    type === 'integer' || type === 'numeric' || type === 'string';
  const dataCompInput = transformCompositionAsFlatStackInput(
    columnDatum,
    'static',
  );
  const dynamicCompInput = transformCompositionAsFlatStackInput(
    columnDatum,
    'dynamic',
  );
  //FIXME: Empty-state is blank! (Check other widgets as well!)
  return (
    <>
      {dataCompInput && (
        <Box mb={6}>
          <Text fontSize={'xl'}>Data Composition</Text>
          <Divider my={3} />
          <Box height={'55px'}>
            <FlatStackedBarChart data={dataCompInput} />
          </Box>
          <Box mt={6}>
            <SRGeneralColumnMetrics columnDatum={columnDatum} width={'100%'} />
          </Box>
        </Box>
      )}
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
    </>
  );
}
