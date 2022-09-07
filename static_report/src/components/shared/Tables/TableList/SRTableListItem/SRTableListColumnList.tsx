import { Grid, GridItem, Flex, Icon, Text } from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';

import { HistogramChart } from '../../../Charts/HistogramChart';
import { ColumnName } from '../ColumnName';
import { ColumnAssertionLabel } from '../../../Assertions/ColumnAssertionLabel';

import { getIconForColumnType } from '../../../../../utils/transformers';
import type { TableSchema } from '../../../../../sdlc/single-report-schema';
import type { Selectable } from '../../../../../types';
import { getAssertions } from '../../../../../utils/assertion';

interface Props extends Selectable {
  table: TableSchema;
}

export function SRTableListColumnList({ table, onSelect }: Props) {
  const columns = getTableColumns(table);

  return (
    <>
      {columns.map(({ colName, colIcon, mergedColAssertions }) => {
        const columnDatum = table.columns[colName];

        return (
          <Grid
            p={3}
            key={colName}
            alignItems="center"
            templateColumns="207px 2.5fr 1fr 2rem"
            _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
            onClick={() =>
              onSelect({ tableName: table.name, columnName: columnDatum.name })
            }
            data-cy="sr-table-list-column-item"
          >
            <GridItem>
              <ColumnName name={colName} icon={colIcon} />
            </GridItem>

            <GridItem>
              <Flex width="calc(100% - 50px)" height="80px">
                <HistogramChart hideAxis data={columnDatum} />
              </Flex>
            </GridItem>

            <GridItem>
              {!mergedColAssertions ? (
                <Text color="gray.500">No assertions</Text>
              ) : (
                <ColumnAssertionLabel {...getAssertions(mergedColAssertions)} />
              )}
            </GridItem>

            <GridItem>
              <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
            </GridItem>
          </Grid>
        );
      })}
    </>
  );
}

function getTableColumns(table: TableSchema) {
  const columns = Object.keys(table.columns).map((colName) => {
    const { icon: colIcon } = getIconForColumnType(table.columns[colName]);
    const columnDatum = table.columns[colName];
    const mergedColAssertions = [
      ...(table.piperider_assertion_result?.columns[colName] || []),
      ...(table.dbt_assertion_result?.columns[colName] || []),
    ];

    return {
      colName,
      colIcon,
      columnDatum,
      mergedColAssertions,
    };
  });

  return columns;
}