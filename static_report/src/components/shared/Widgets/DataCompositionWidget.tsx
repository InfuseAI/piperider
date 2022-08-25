import { Divider, Text, Box } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { formatTitleCase } from '../../../utils/formatters';
import { transformCompositionAsFlatStackInput } from '../../../utils/transformers';
import { FlatStackedBarChart } from '../Charts/FlatStackedBarChart';
import { GeneralTableColumn } from '../GeneralTableColumn';
import { TextNumberTableColumn } from '../TextNumberTableColumn';

interface Props {
  columnDatum: ColumnSchema;
}
export function DataCompositionWidget({ columnDatum }: Props) {
  const { type } = columnDatum;
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
            <GeneralTableColumn baseColumn={columnDatum} width={'100%'} />
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
            <TextNumberTableColumn baseColumn={columnDatum} width={'100%'} />
          </Box>
        </Box>
      )}
    </>
  );
}
