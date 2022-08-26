import { CRTableListColumnDetail } from './CRTableListColumnDetail';
import {
  getIconForColumnType,
  transformAsNestedBaseTargetRecord,
} from '../../../utils/transformers';
import type {
  ColumnSchema,
  TableSchema,
} from '../../../sdlc/single-report-schema';

export function CRTableListColumnDetails({
  base,
  target,
}: {
  base: TableSchema;
  target: TableSchema;
}) {
  const mergedAssertionColumns = Object.keys(
    base.piperider_assertion_result?.columns || {},
  ).map((colName) => {
    const mergedBaseColAssertions = [
      ...(base.piperider_assertion_result?.columns?.[colName] || []),
      ...(base.dbt_assertion_result?.columns?.[colName] || []),
    ];

    const mergedTargetColAssertions = [
      ...(target.piperider_assertion_result?.columns?.[colName] || []),
      ...(target.dbt_assertion_result?.columns?.[colName] || []),
    ];

    const { icon: colIcon } = getIconForColumnType(target.columns[colName]);

    const transformedData = transformAsNestedBaseTargetRecord<
      TableSchema['columns'],
      ColumnSchema
    >(base.columns, target.columns);

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
          <CRTableListColumnDetail
            key={colName}
            name={colName}
            data={data}
            icon={colIcon}
            baseColAssertions={mergedBaseColAssertions}
            targetColAssertions={mergedTargetColAssertions}
          />
        ),
      )}
    </>
  );
}
