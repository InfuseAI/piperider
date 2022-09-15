import { Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Selectable, ZColSchema } from '../../../../types';
import { getChartKindByColumnType, getDataChart } from '../../Charts/utils';
import { checkColumnCategorical } from '../../../../utils/transformers';
import { ChartContainer } from '../../Charts/ChartContainer';
import { ColumnTypeHeader } from '../ColumnTypeHeader';
import { ColumnTypeDetailBoolean } from './ColumnTypeDetail/ColumnTypeDetailBoolean';
import { ColumnTypeDetailCategorical } from './ColumnTypeDetail/ColumnTypeDetailCategorical';
import { ColumnTypeDetailDatetime } from './ColumnTypeDetail/ColumnTypeDetailDatetime';
import { ColumnTypeDetailNumeric } from './ColumnTypeDetail/ColumnTypeDetailNumeric';
import { ColumnTypeDetailOther } from './ColumnTypeDetail/ColumnTypeDetailOther';
import { ColumnTypeDetailText } from './ColumnTypeDetail/ColumnTypeDetailText';

interface Props extends Selectable {
  columnDatum: ColumnSchema;
}
/**
 * A Column Card that shows the main highlights of the column data
 * Includes: Main Chart (single); Highlight Metrics; Detail link
 */
export function ColumnHighlightsCard({ columnDatum, onSelect }: Props) {
  ZColSchema.parse(columnDatum);
  const { name: columnName } = columnDatum;

  return (
    <Flex
      direction={'column'}
      bg={'gray.300'}
      width={{ xl: '32%', lg: '45%', md: '100%', base: '100%' }}
      border="1px solid"
      borderColor={'gray.300'}
      my={3}
      rounded={'lg'}
    >
      <ColumnTypeHeader
        columnDatum={columnDatum}
        bg={'blue.800'}
        color={'white'}
      />
      <ChartContainer
        title={columnName}
        allowModalPopup={Boolean(getChartKindByColumnType(columnDatum))}
      >
        {getDataChart(columnDatum)}
      </ChartContainer>
      <Flex
        p={2}
        bg={'white'}
        height={'100%'}
        direction="column"
        borderBottomRadius={'inherit'}
      >
        <>
          {_getColumnBodyContentUI(columnDatum)}
          <Flex
            justifyContent={'center'}
            py={2}
            h={'100%'}
            alignItems={'end'}
            _hover={{ bgColor: 'blackAlpha.50' }}
            cursor={'pointer'}
            onClick={() => onSelect({ columnName })}
            data-cy="column-card-details-link"
          >
            <Text as={'a'} color="blue.400">
              Details
            </Text>
          </Flex>
        </>
      </Flex>
    </Flex>
  );
}

/**
 * Handles the logic for rendering the right Column Details
 * @param columnDatum
 * @returns ColumnTypeDetail* Component
 */
function _getColumnBodyContentUI(columnDatum: ColumnSchema) {
  const { type } = columnDatum;
  const isCategorical = checkColumnCategorical(columnDatum);

  if ((type === 'string' || type === 'integer') && isCategorical)
    return <ColumnTypeDetailCategorical columnDatum={columnDatum} />;
  if (type === 'numeric' || type === 'integer')
    return <ColumnTypeDetailNumeric columnDatum={columnDatum} />;
  if (type === 'boolean')
    return <ColumnTypeDetailBoolean columnDatum={columnDatum} />;
  if (type === 'string')
    return <ColumnTypeDetailText columnDatum={columnDatum} />;
  if (type === 'datetime')
    return <ColumnTypeDetailDatetime columnDatum={columnDatum} />;
  if (type === 'other')
    return <ColumnTypeDetailOther columnDatum={columnDatum} />;

  return (
    <Text textAlign={'center'} w={'inherit'}>
      The column type: {type} cannot be displayed
    </Text>
  );
}
