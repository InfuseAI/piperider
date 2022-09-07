import {
  Box,
  Divider,
  Flex,
  FlexProps,
  Icon,
  Progress,
  Text,
} from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable } from '../../../../types';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import {
  getColumnMetricRatio,
  getIconForColumnType,
} from '../../../../utils/transformers';
import { NO_VALUE } from '../constants';

interface Props extends Comparable {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
  onSelect: (arg: string) => void;
  isActive: boolean;
}
/**
 * A list item showing a base column detail's name, valid% progress bar(s) depending on split-view
 */
export function ColumnDetailListItem({
  baseColumnDatum,
  targetColumnDatum,
  onSelect,
  isActive,
  singleOnly,
  ...props
}: Props & FlexProps) {
  const { icon, backgroundColor } = getIconForColumnType(baseColumnDatum);
  const fallbackColumnDatum = baseColumnDatum || targetColumnDatum;
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
        onClick={() => onSelect(fallbackColumnDatum?.name || '')}
        bg={isActive ? 'blue.100' : 'inherit'}
        _hover={{ bgColor: 'blackAlpha.50' }}
        data-cy="column-detail-list-item"
        {...props}
      >
        <Flex alignItems={'center'}>
          <Icon
            mx={2}
            p={1}
            rounded={'md'}
            color={'white'}
            backgroundColor={backgroundColor}
            as={icon}
            boxSize={5}
          />
          <Text noOfLines={1} width={'14em'} fontSize={'lg'}>
            {fallbackColumnDatum?.name || NO_VALUE}
          </Text>
        </Flex>
        <Box width={'100%'}>
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
