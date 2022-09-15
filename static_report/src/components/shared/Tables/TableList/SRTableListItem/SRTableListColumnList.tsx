import { Grid, GridItem, Flex, Text } from '@chakra-ui/react';

import HistogramChart from '../../../Charts/HistogramChart';
import { ColumnName } from '../ColumnName';
import { AssertionLabel } from '../../../Assertions';

import type { TableSchema } from '../../../../../sdlc/single-report-schema';
import type { Selectable } from '../../../../../types';
import { getAssertions } from '../../../../../utils/assertion';
import { getIconForColumnType } from '../../../Columns/utils';

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
            templateColumns="207px 2.5fr 1.2fr"
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
                <AssertionLabel {...getAssertions(mergedColAssertions)} />
              )}
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
