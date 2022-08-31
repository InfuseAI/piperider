import { Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'wouter';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import { formatDate } from '../../utils/formatters';
import { checkColumnCategorical } from '../../utils/transformers';
import { ColumnCardHeader } from '../shared/ColumnCard/ColumnCardHeader';
import { NO_VALUE } from '../shared/ColumnCard/ColumnTypeDetail/constants';
import { SRGeneralColumnMetrics } from '../shared/ColumnMetrics/SRGeneralColumnMetrics';
import { MetricsInfo } from '../shared/ColumnMetrics/MetricsInfo';
import { SummaryStats } from '../shared/ColumnMetrics/SummaryStats';

// props made optional as they can be undefined
type CRTableColumnDetailsProps = {
  baseColumn?: ColumnSchema;
  targetColumn?: ColumnSchema;
};
export const CRTableColumnDetails = ({
  baseColumn,
  targetColumn,
}: CRTableColumnDetailsProps) => {
  const fallback = baseColumn || targetColumn;
  const isCategorical = checkColumnCategorical(baseColumn);
  const [currentLocation] = useLocation();

  zReport(ZColSchema.safeParse(baseColumn));
  zReport(ZColSchema.safeParse(targetColumn));

  return (
    <Flex
      direction="column"
      gap={2}
      minH="250px"
      border={'1px solid darkgray'}
      rounded={'2xl'}
    >
      {fallback && <ColumnCardHeader columnDatum={fallback} />}
      <Flex direction="column" gap={3} m={4}>
        <Flex gap={8}>
          <Text ml={'16'} fontWeight={700} textAlign="right" width="100px">
            Base
          </Text>
          <Text fontWeight={700} textAlign="right" width="100px">
            Target
          </Text>
        </Flex>

        <Flex direction="column" mt={3}>
          {/* Case: Cast provided undefined to null */}
          <SRGeneralColumnMetrics columnDatum={baseColumn} />
        </Flex>

        {baseColumn?.type === 'numeric' && (
          <SummaryStats
            baseColumn={baseColumn}
            targetColumn={targetColumn || null}
          />
        )}

        {baseColumn?.type === 'datetime' && (
          <Flex direction="column">
            <MetricsInfo
              name="Min"
              metakey="min"
              firstSlot={formatDate(String(baseColumn?.min))}
              secondSlot={formatDate(String(targetColumn?.min))}
            />
            <MetricsInfo
              name="Max"
              metakey="max"
              firstSlot={formatDate(String(baseColumn?.max))}
              secondSlot={formatDate(String(targetColumn?.max))}
            />
          </Flex>
        )}

        {isCategorical && (
          <Flex direction="column">
            <MetricsInfo
              name="Most Common"
              metakey="topk"
              firstSlot={String(baseColumn?.topk?.values[0]) ?? NO_VALUE}
              secondSlot={String(targetColumn?.topk?.values[0]) ?? NO_VALUE}
            />
          </Flex>
        )}
      </Flex>
      {fallback && (
        <Flex justifyContent={'center'} p={3}>
          <Link href={`${currentLocation}/columns/${fallback.name}`}>
            <Text as={'a'} color="gray.700">
              Details
            </Text>
          </Link>
        </Flex>
      )}
    </Flex>
  );
};
