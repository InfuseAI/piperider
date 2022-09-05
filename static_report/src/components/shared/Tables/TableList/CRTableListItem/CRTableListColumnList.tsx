import {
  getIconForColumnType,
  transformAsNestedBaseTargetRecord,
} from '../../../../../utils/transformers';
import type { ColumnSchema } from '../../../../../sdlc/single-report-schema';
import { SaferTableSchema, Selectable } from '../../../../../types';
import { Box, Flex, Grid, GridItem, Icon, Text } from '@chakra-ui/react';
import { getAssertions } from '../../../../../utils/assertion';
import { FiArrowRight, FiChevronRight } from 'react-icons/fi';
import { HistogramChart } from '../../../Charts/HistogramChart';
import { ColumnName } from '../ColumnName';
import {
  CRBaseTableAssertionsSummary,
  CRTargetTableAssertionsSummary,
} from './CRTableListAssertions';
import { NoData } from '../../../NoData';

interface Props extends Selectable {
  baseTableDatum?: SaferTableSchema;
  targetTableDatum?: SaferTableSchema;
}
export function CRTableListColumnList({
  baseTableDatum,
  targetTableDatum,
  onSelect,
}: Props) {
  const transformedData = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema
  >(baseTableDatum?.columns, targetTableDatum?.columns);
  const tableName = baseTableDatum?.name || targetTableDatum?.name;
  const columns = Object.keys(targetTableDatum?.columns || {}).map(
    (colName) => {
      const { icon: colIcon } = getIconForColumnType(
        targetTableDatum
          ? targetTableDatum?.columns[colName]
          : baseTableDatum?.columns[colName],
      );

      const mergedBaseColAssertions = [
        ...(baseTableDatum?.piperider_assertion_result?.columns[colName] || []),
        ...(baseTableDatum?.dbt_assertion_result?.columns[colName] || []),
      ];

      const mergedTargetColAssertions = [
        ...(targetTableDatum?.piperider_assertion_result?.columns[colName] ||
          []),
        ...(targetTableDatum?.dbt_assertion_result?.columns[colName] || []),
      ];

      return {
        colName,
        colIcon,
        mergedBaseColAssertions,
        mergedTargetColAssertions,
      };
    },
  );

  if (columns.length === 0) {
    return (
      <Text textAlign="center" py={5}>
        No columns
      </Text>
    );
  }

  return (
    <>
      {columns.map(
        ({
          colName,
          colIcon,
          mergedBaseColAssertions,
          mergedTargetColAssertions,
        }) => {
          const baseAssertions = getAssertions(mergedBaseColAssertions);
          const targetAssertions = getAssertions(mergedTargetColAssertions);
          const colDatum = transformedData[colName];

          return (
            <Grid
              p={3}
              key={colName}
              alignItems="center"
              templateColumns="205px 2.3fr 1.5fr 2rem"
              _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
              onClick={() => onSelect({ tableName, columnName: colName })}
              data-cy="cr-table-list-column-item"
            >
              <GridItem>
                <ColumnName name={colName} icon={colIcon} />
              </GridItem>

              <GridItem>
                <Flex gap={4} width="calc(100% - 50px)" height="80px">
                  <Box width="50%">
                    {colDatum?.base ? (
                      <HistogramChart hideAxis data={colDatum.base} />
                    ) : (
                      <NoData />
                    )}
                  </Box>
                  <Box width="50%">
                    {colDatum?.target ? (
                      <HistogramChart hideAxis data={colDatum.target} />
                    ) : (
                      <NoData />
                    )}
                  </Box>
                </Flex>
              </GridItem>

              <GridItem>
                {baseAssertions.total > 0 && targetAssertions.total > 0 ? (
                  <Flex gap={2} color="gray.500" alignItems="center">
                    <CRBaseTableAssertionsSummary {...baseAssertions} />
                    <Icon as={FiArrowRight} />
                    <CRTargetTableAssertionsSummary
                      {...targetAssertions}
                      baseAssertionsFailed={baseAssertions.failed}
                      assertionsDiff={
                        targetAssertions.total - baseAssertions.total
                      }
                    />
                  </Flex>
                ) : (
                  <Text color="gray.500">No assertions</Text>
                )}
              </GridItem>

              <GridItem>
                <Flex alignItems="center">
                  <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
                </Flex>
              </GridItem>
            </Grid>
          );
        },
      )}
    </>
  );
}
