import {
  Box,
  Divider,
  Flex,
  FlexProps,
  Progress,
  Text,
} from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, Selectable } from '../../../../types';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { ColumnName } from '../../Tables';
import { getColumnMetricRatio, getIconForColumnType } from '../utils';

interface Props extends Comparable, Selectable {
  tableName: string;
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
  isActive: boolean;
}
/**
 * A list item showing a base column detail's name, valid% progress bar(s) depending on split-view
 */
export function ColumnDetailListItem({
  tableName,
  baseColumnDatum,
  targetColumnDatum,
  onSelect,
  isActive,
  singleOnly,
  ...props
}: Props & FlexProps) {
  const fallbackColumnDatum = baseColumnDatum || targetColumnDatum;
  const { icon, backgroundColor } = getIconForColumnType(fallbackColumnDatum);
  const baseValidsOfTotal = getColumnMetricRatio('valids', baseColumnDatum);
  const targetValidsOfTotal = getColumnMetricRatio('valids', targetColumnDatum);
  const baseValidsPercentValue = Number(baseValidsOfTotal) * 100;
  const targetValidsPercentValue = Number(targetValidsOfTotal) * 100;
  const baseValidsPercentLabel = formatColumnValueWith(
    baseValidsOfTotal,
    formatIntervalMinMax,
  );
  const targetValidsPercentLabel = formatColumnValueWith(
    targetValidsOfTotal,
    formatIntervalMinMax,
  );

  return (
    <>
      <Flex
        justifyContent={'space-between'}
        alignItems={'center'}
        cursor={'pointer'}
        onClick={() =>
          onSelect({ tableName, columnName: fallbackColumnDatum?.name || '' })
        }
        bg={isActive ? 'blue.100' : 'inherit'}
        _hover={{ bgColor: 'blackAlpha.50' }}
        data-cy="column-detail-list-item"
        {...props}
      >
        <ColumnName
          iconColor={backgroundColor}
          icon={icon}
          name={fallbackColumnDatum?.name}
        />
        <Box w={'12em'}>
          {!singleOnly && (
            <Text fontSize={'sm'} color={'gray.600'} fontWeight={'semibold'}>
              Base
            </Text>
          )}
          {baseValidsPercentLabel && (
            <Progress value={baseValidsPercentValue} />
          )}
          <Flex justifyContent={'space-between'}>
            <Text fontSize={'xs'} mr={2}>
              {baseValidsPercentLabel || 'N/A'}
            </Text>
            <Text fontSize={'xs'} color={'gray.600'}>
              Valid
            </Text>
          </Flex>
          {!singleOnly && (
            <Box mt={3}>
              <Text fontSize={'sm'} color={'gray.600'} fontWeight={'semibold'}>
                Target
              </Text>
              {targetValidsPercentLabel && (
                <Progress value={targetValidsPercentValue} />
              )}
              <Flex justifyContent={'space-between'}>
                <Text fontSize={'xs'} mr={2}>
                  {targetValidsPercentLabel || 'N/A'}
                </Text>
                <Text fontSize={'xs'} color={'gray.600'}>
                  Valid
                </Text>
              </Flex>
            </Box>
          )}
        </Box>
      </Flex>
      <Divider />
    </>
  );
}
