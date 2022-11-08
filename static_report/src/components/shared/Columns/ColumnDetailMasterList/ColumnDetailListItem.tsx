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
import { getIconForColumnType } from '../utils';

interface Props extends Comparable, Selectable {
  tableName: string;
  baseColumnDatum?: Partial<ColumnSchema>;
  targetColumnDatum?: Partial<ColumnSchema>;
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
  const fallbackColumnDatum = targetColumnDatum || baseColumnDatum;
  const { icon, backgroundColor } = getIconForColumnType(fallbackColumnDatum);
  const { valids_p: baseValidRatio } = baseColumnDatum || {};
  const baseValidsPercentValue = Number(baseValidRatio) * 100;
  const baseValidsPercentLabel = formatColumnValueWith(
    baseValidRatio,
    formatIntervalMinMax,
  );
  const { valids_p: targetValidRatio } = targetColumnDatum || {};
  const targetValidsPercentValue = Number(targetValidRatio) * 100;
  const targetValidsPercentLabel = formatColumnValueWith(
    targetValidRatio,
    formatIntervalMinMax,
  );
  console.log(baseValidsPercentValue);

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
            <Progress value={baseValidsPercentValue || 0} />
          )}
          <Flex justifyContent={'space-between'}>
            <Text fontSize={'xs'} mr={2}>
              {baseValidsPercentLabel}
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
                <Progress value={targetValidsPercentValue || 0} />
              )}
              <Flex justifyContent={'space-between'}>
                <Text fontSize={'xs'} mr={2}>
                  {targetValidsPercentLabel}
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
