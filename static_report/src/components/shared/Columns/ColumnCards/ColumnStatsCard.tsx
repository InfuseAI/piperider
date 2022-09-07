import { Box, Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, Selectable, ZColSchema, zReport } from '../../../../types';
import { checkColumnCategorical } from '../../../../utils/transformers';
import { ColumnTypeHeader } from '../ColumnTypeHeader';
import { NO_VALUE } from '../constants';
import { MetricsInfo } from '../ColumnMetrics/MetricsInfo';
import { GeneralStats } from '../ColumnMetrics/GeneralStats';
import { SummaryStats } from '../ColumnMetrics/SummaryStats';

interface Props extends Selectable, Comparable {
  baseColumn?: ColumnSchema;
  targetColumn?: ColumnSchema;
}
/**
 * Column Card that displays pure metric stats
 */
export const ColumnStatsCard = ({
  baseColumn,
  targetColumn,
  singleOnly,
  onSelect,
}: Props) => {
  const fallback = baseColumn || targetColumn;
  const isCategorical = checkColumnCategorical(baseColumn);

  zReport(ZColSchema.safeParse(baseColumn));
  zReport(ZColSchema.safeParse(targetColumn));

  return (
    <Flex
      direction="column"
      minH="250px"
      border={'1px solid darkgray'}
      rounded={'2xl'}
    >
      {fallback && (
        <ColumnTypeHeader
          columnDatum={fallback}
          bg={'blue.800'}
          color={'white'}
        />
      )}
      <Box m={4}>
        {!singleOnly && (
          <MetricsInfo
            name=""
            firstSlot={'Base'}
            secondSlot={'Target'}
            width={'100%'}
            fontWeight={'bold'}
            mb={3}
          />
        )}

        <Box mb={3}>
          <GeneralStats
            baseColumnDatum={baseColumn}
            targetColumnDatum={targetColumn}
            singleOnly={singleOnly}
          />
        </Box>

        <Box mb={3}>
          <SummaryStats
            baseColumnDatum={baseColumn}
            targetColumnDatum={targetColumn}
            singleOnly={singleOnly}
          />
        </Box>

        {isCategorical && (
          <Box>
            <MetricsInfo
              name="Most Common"
              metakey="topk"
              width={'100%'}
              firstSlot={baseColumn?.topk?.values[0] ?? NO_VALUE}
              secondSlot={targetColumn?.topk?.values[0] ?? NO_VALUE}
            />
          </Box>
        )}
      </Box>
      {fallback && (
        <Flex
          justifyContent={'center'}
          p={3}
          h={'100%'}
          alignItems={'end'}
          cursor={'pointer'}
          onClick={() => onSelect({ columnName: fallback.name })}
        >
          <Text as={'a'} color="blue.400">
            Details
          </Text>
        </Flex>
      )}
    </Flex>
  );
};
