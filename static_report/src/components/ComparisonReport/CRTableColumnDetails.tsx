import { Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import { formatDate } from '../../utils/formatters';
import { ColumnCardHeader } from '../shared/ColumnCard/ColumnCardHeader';
import { NO_VALUE } from '../shared/ColumnCard/ColumnTypeDetail/constants';
import { GeneralTableColumn } from '../shared/GeneralTableColumn';
import { MetricsInfo } from '../shared/MetricsInfo';
import { NumericTableColumn } from '../shared/NumericTableColumn';

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
          <GeneralTableColumn
            baseColumn={baseColumn}
            targetColumn={targetColumn || null}
          />
        </Flex>

        {baseColumn?.type === 'numeric' && (
          <NumericTableColumn
            baseColumn={baseColumn}
            targetColumn={targetColumn || null}
          />
        )}

        {baseColumn?.type === 'datetime' && (
          <Flex direction="column">
            <MetricsInfo
              name="Min"
              firstSlot={formatDate(String(baseColumn?.min)) ?? NO_VALUE}
              secondSlot={formatDate(String(targetColumn?.min)) ?? NO_VALUE}
            />
            <MetricsInfo
              name="Max"
              firstSlot={formatDate(String(baseColumn?.max)) ?? NO_VALUE}
              secondSlot={formatDate(String(targetColumn?.max)) ?? NO_VALUE}
            />
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
