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
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import {
  getColumnMetricRatio,
  getIconForColumnType,
} from '../../../../utils/transformers';
import { NO_VALUE } from '../ColumnCard/ColumnTypeDetail/constants';

interface Props {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
  onSelect: (arg: string) => void;
  isActive: boolean;
  hasSplitView?: boolean;
}
export function ColumnDetailListItem({
  baseColumnDatum,
  targetColumnDatum,
  onSelect,
  isActive,
  hasSplitView,
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
          {hasSplitView && (
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
          {hasSplitView && (
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
