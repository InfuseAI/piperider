import { Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'wouter';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema } from '../../../types';
import { getDataChart } from '../../../utils/charts';
import {
  checkColumnCategorical,
  getChartKindByColumnType,
} from '../../../utils/transformers';
import { ColumnCardBodyContainer } from './ColumnCardBodyContainer';
import { ColumnCardDataVisualContainer } from './ColumnCardDataVisualContainer';
import { ColumnCardHeader } from './ColumnCardHeader';
import { ColumnTypeDetailBoolean } from './ColumnTypeDetail/ColumnTypeDetailBoolean';
import { ColumnTypeDetailCategorical } from './ColumnTypeDetail/ColumnTypeDetailCategorical';
import { ColumnTypeDetailDatetime } from './ColumnTypeDetail/ColumnTypeDetailDatetime';
import { ColumnTypeDetailNumeric } from './ColumnTypeDetail/ColumnTypeDetailNumeric';
import { ColumnTypeDetailOther } from './ColumnTypeDetail/ColumnTypeDetailOther';
import { ColumnTypeDetailText } from './ColumnTypeDetail/ColumnTypeDetailText';

interface Props {
  columnDatum: ColumnSchema;
}
export function ColumnCard({ columnDatum }: Props) {
  ZColSchema.parse(columnDatum);
  const { name: title } = columnDatum;
  const [parentLocation] = useLocation();

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
      <ColumnCardHeader
        columnDatum={columnDatum}
        bg={'blue.800'}
        color={'white'}
      />
      <ColumnCardDataVisualContainer
        title={title}
        allowModalPopup={Boolean(getChartKindByColumnType(columnDatum))}
      >
        {getDataChart(columnDatum)}
      </ColumnCardDataVisualContainer>
      <ColumnCardBodyContainer>
        {_getColumnBodyContentUI(columnDatum)}
      </ColumnCardBodyContainer>
      <Flex justifyContent={'center'} p={3}>
        <Link href={`${parentLocation}/columns/${title}`}>
          <Text as={'a'} color="gray.700">
            Details
          </Text>
        </Link>
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
