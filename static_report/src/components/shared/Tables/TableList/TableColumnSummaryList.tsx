import { transformAsNestedBaseTargetRecord } from '../../../../utils/transformers';
import type { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, SaferTableSchema, Selectable } from '../../../../types';
import { Flex, Grid, GridItem, Icon, Text } from '@chakra-ui/react';
import { getReportAggregateAssertions } from '../utils';
import { FiArrowRight, FiChevronRight } from 'react-icons/fi';
import { HistogramChart } from '../../Charts/HistogramChart';
import { ColumnName } from './ColumnName';
import { NoData } from '../../Layouts/NoData';
import { getIconForColumnType } from '../../Columns/utils';
import { tableListGridTempCols } from '../../../../utils/layout';
import { AssertionLabel } from '../../Assertions';
import { TargetTableAssertionsSummary } from './TableListAssertions';
import { ColumnSchemaTypeLabel } from './ColumnSchemaTypeLabel';

interface Props extends Selectable, Comparable {
  baseTableDatum?: SaferTableSchema;
  targetTableDatum?: SaferTableSchema;
}
export function TableColumnSummaryList({
  baseTableDatum,
  targetTableDatum,
  onSelect,
  singleOnly,
}: Props) {
  const comparedColumns = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema
  >(baseTableDatum?.columns, targetTableDatum?.columns);
  const tableName = baseTableDatum?.name || targetTableDatum?.name;
  const columns = Object.keys(baseTableDatum?.columns || {}).map((colName) => {
    const { icon: colIcon, backgroundColor } = getIconForColumnType(
      baseTableDatum
        ? baseTableDatum?.columns[colName]
        : targetTableDatum?.columns[colName],
    );

    const baseAssertions = getReportAggregateAssertions(
      baseTableDatum?.piperider_assertion_result,
      baseTableDatum?.dbt_assertion_result,
    );
    const targetAssertions = getReportAggregateAssertions(
      targetTableDatum?.piperider_assertion_result,
      targetTableDatum?.dbt_assertion_result,
    );

    return {
      colName,
      colIcon,
      colIconColor: backgroundColor,
      baseAssertions,
      targetAssertions,
    };
  });

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
          colIconColor,
          baseAssertions,
          targetAssertions,
        }) => {
          const colDatum = comparedColumns[colName];

          return (
            <Grid
              key={colName}
              alignItems="center"
              templateColumns={`${tableListGridTempCols} 2rem`}
              _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
              onClick={() => onSelect({ tableName, columnName: colName })}
              data-cy="table-list-summary-item-item"
            >
              <GridItem>
                <ColumnName
                  name={colName}
                  icon={colIcon}
                  iconColor={colIconColor}
                />
                <ColumnSchemaTypeLabel
                  schemaType={colDatum.base?.schema_type}
                  ml={25}
                />
              </GridItem>

              <GridItem>
                <Grid
                  gap={4}
                  templateColumns={singleOnly ? '1fr' : '1fr 1fr'}
                  height="80px"
                >
                  <GridItem>
                    {colDatum?.base ? (
                      <HistogramChart hideAxis data={colDatum.base} />
                    ) : (
                      <NoData />
                    )}
                  </GridItem>
                  {!singleOnly && (
                    <GridItem mr={2}>
                      {colDatum?.target ? (
                        <HistogramChart hideAxis data={colDatum.target} />
                      ) : (
                        <NoData />
                      )}
                    </GridItem>
                  )}
                </Grid>
              </GridItem>

              <GridItem>
                {baseAssertions.total > 0 &&
                (singleOnly || targetAssertions.total > 0) ? (
                  <Flex gap={2} color="gray.500" alignItems="center">
                    <AssertionLabel {...baseAssertions} />
                    {!singleOnly && (
                      <>
                        <Icon as={FiArrowRight} />
                        <TargetTableAssertionsSummary
                          {...targetAssertions}
                          baseAssertionsFailed={baseAssertions.failed}
                          delta={targetAssertions.total - baseAssertions.total}
                        />
                      </>
                    )}
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
