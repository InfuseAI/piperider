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
  const transformedData = transformAsNestedBaseTargetRecord<
    TableSchema['columns'],
    ColumnSchema
  >(baseTableDatum.columns, targetTableDatum.columns);

  const columns = Object.keys(targetTableDatum.columns).map((colName) => {
    const { icon: colIcon } = getIconForColumnType(
      targetTableDatum.columns[colName],
    );

    const mergedBaseColAssertions = [
      ...(baseTableDatum.piperider_assertion_result?.columns[colName] || []),
      ...(baseTableDatum.dbt_assertion_result?.columns[colName] || []),
    ];

    const mergedTargetColAssertions = [
      ...(targetTableDatum.piperider_assertion_result?.columns[colName] || []),
      ...(targetTableDatum.dbt_assertion_result?.columns[colName] || []),
    ];

    return {
      colName,
      colIcon,
      mergedBaseColAssertions,
      mergedTargetColAssertions,
    };
  });

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
