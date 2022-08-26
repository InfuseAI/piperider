import { CRTableListColumnItem } from './CRTableListColumnItem';
import {
  getIconForColumnType,
  transformAsNestedBaseTargetRecord,
} from '../../../utils/transformers';
import type {
  ColumnSchema,
  TableSchema,
} from '../../../sdlc/single-report-schema';

export function CRTableListColumnList({
  baseTableDatum,
  targetTableDatum,
}: {
  baseTableDatum: TableSchema;
  targetTableDatum: TableSchema;
}) {
  const mergedAssertionColumns = Object.keys(
    baseTableDatum.piperider_assertion_result?.columns || {},
  ).map((colName) => {
    const mergedBaseColAssertions = [
      ...(baseTableDatum.piperider_assertion_result?.columns?.[colName] || []),
      ...(baseTableDatum.dbt_assertion_result?.columns?.[colName] || []),
    ];

    const mergedTargetColAssertions = [
      ...(targetTableDatum.piperider_assertion_result?.columns?.[colName] ||
        []),
      ...(targetTableDatum.dbt_assertion_result?.columns?.[colName] || []),
    ];

    const { icon: colIcon } = getIconForColumnType(
      targetTableDatum.columns[colName],
    );

    const transformedData = transformAsNestedBaseTargetRecord<
      TableSchema['columns'],
      ColumnSchema
    >(baseTableDatum.columns, targetTableDatum.columns);

    return {
      colName,
      mergedBaseColAssertions,
      mergedTargetColAssertions,
      colIcon,
      data: transformedData[colName],
    };
  });

  return (
    <>
      {mergedAssertionColumns.map(
        ({
          colName,
          colIcon,
          data,
          mergedBaseColAssertions,
          mergedTargetColAssertions,
        }) => (
          <CRTableListColumnItem
            key={colName}
            name={colName}
            columnDatum={data}
            icon={colIcon}
            baseColAssertions={mergedBaseColAssertions}
            targetColAssertions={mergedTargetColAssertions}
          />
        ),
      )}
    </>
  );
}
