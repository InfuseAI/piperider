import { CRTableListColumnItem } from './CRTableListColumnItem';
import {
  getIconForColumnType,
  transformAsNestedBaseTargetRecord,
} from '../../../utils/transformers';
import type { ColumnSchema } from '../../../sdlc/single-report-schema';
import { SaferTableSchema } from '../../../types';
import { Text } from '@chakra-ui/react';

export function CRTableListColumnList({
  baseTableDatum,
  targetTableDatum,
}: {
  baseTableDatum?: SaferTableSchema;
  targetTableDatum?: SaferTableSchema;
}) {
  const transformedData = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema | undefined
  >(baseTableDatum?.columns, targetTableDatum?.columns);

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
        }) => (
          <CRTableListColumnItem
            key={colName}
            name={colName}
            columnDatum={transformedData[colName]}
            icon={colIcon}
            baseColAssertions={mergedBaseColAssertions}
            targetColAssertions={mergedTargetColAssertions}
          />
        ),
      )}
    </>
  );
}
