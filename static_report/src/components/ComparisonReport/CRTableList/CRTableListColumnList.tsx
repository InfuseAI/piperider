import get from 'lodash/get';

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
      ...get(
        baseTableDatum,
        `piperider_assertion_result.columns[${colName}]`,
        [],
      ),
      ...get(baseTableDatum, `dbt_assertion_result.columns[${colName}]`, []),
    ];

    const mergedTargetColAssertions = [
      ...get(
        targetTableDatum,
        `piperider_assertion_result.columns[${colName}]`,
        [],
      ),
      ...get(targetTableDatum, `dbt_assertion_result.columns[${colName}]`, []),
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
