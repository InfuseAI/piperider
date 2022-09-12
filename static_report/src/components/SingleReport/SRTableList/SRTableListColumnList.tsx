import { TableSchema } from '../../../sdlc/single-report-schema';
import { getIconForColumnType } from '../../../utils/transformers';
import { SRTableListColumnItem } from './SRTableListColumnItem';

export function SRTableListColumnList({ table }: { table: TableSchema }) {
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

  return (
    <>
      {columns.map(({ colName, colIcon, mergedColAssertions }) => (
        <SRTableListColumnItem
          key={colName}
          name={colName}
          columnDatum={table.columns[colName]}
          colAssertions={mergedColAssertions}
          tableName={table.name}
          icon={colIcon}
        />
      ))}
    </>
  );
}