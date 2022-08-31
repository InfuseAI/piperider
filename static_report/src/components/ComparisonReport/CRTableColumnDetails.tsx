import { Box, Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'wouter';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import { checkColumnCategorical } from '../../utils/transformers';
import { ColumnCardHeader } from '../shared/ColumnCard/ColumnCardHeader';
import { NO_VALUE } from '../shared/ColumnCard/ColumnTypeDetail/constants';
import { MetricsInfo } from '../shared/ColumnMetrics/MetricsInfo';
import { CRGeneralColumnMetrics } from '../shared/ColumnMetrics/CRGeneralColumnMetrics';
import { CRSummaryStats } from '../shared/ColumnMetrics/CRSummaryStats';

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
      minH="250px"
      border={'1px solid darkgray'}
      rounded={'2xl'}
    >
      {fallback && (
        <ColumnCardHeader
          columnDatum={fallback}
          bg={'blue.800'}
          color={'white'}
        />
      )}
      <Box m={4}>
        <MetricsInfo
          name=""
          firstSlot={'Base'}
          secondSlot={'Target'}
          width={'100%'}
          fontWeight={'bold'}
          mb={3}
        />

        <Box mb={3}>
          <CRGeneralColumnMetrics
            baseColumnDatum={baseColumn}
            targetColumnDatum={targetColumn}
          />
        </Box>

        <Box mb={3}>
          <CRSummaryStats
            baseColumnDatum={baseColumn}
            targetColumnDatum={targetColumn}
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
        <Flex justifyContent={'center'} p={3} h={'100%'} alignItems={'end'}>
          <Link href={`${currentLocation}/columns/${fallback.name}`}>
            <Text as={'a'} color="blue.400">
              Details
            </Text>
          </Link>
        </Flex>
      )}
    </Flex>
  );
};
