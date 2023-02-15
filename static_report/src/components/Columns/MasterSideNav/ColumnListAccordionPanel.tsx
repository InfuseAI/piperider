import { AccordionPanel, Box } from '@chakra-ui/react';
import { Comparable, Selectable } from '../../../types';
import { CompColEntryItem } from '../../../utils';
import { ColumnDetailListItem } from './ColumnDetailListItem';

/**
 * ColumnItemList: Accordion UI Child Body
 */
interface ColumnListAccordionPanelProps extends Comparable, Selectable {
  compColList?: CompColEntryItem[];
  currentColumn?: string;
  currentTable?: string;
  indexedTableName: string;
}
export function ColumnListAccordionPanel({
  compColList = [],
  onSelect,
  singleOnly,
  currentColumn,
  currentTable,
  indexedTableName,
}: ColumnListAccordionPanelProps) {
  return (
    <AccordionPanel>
      <Box>
        {compColList.map(([colKey, { base, target }]) => {
          const isActiveColumn =
            (target || base)?.name === currentColumn &&
            indexedTableName === currentTable;
          // console.log(colKey, isActiveColumn);

          return (
            <Box key={colKey}>
              {/* LIST - Columns */}
              <ColumnDetailListItem
                isActive={isActiveColumn}
                tableName={currentTable}
                baseColumnDatum={base}
                targetColumnDatum={target}
                onSelect={(data) => {
                  onSelect({ ...data, tableName: indexedTableName });
                }}
                singleOnly={singleOnly}
                p={3}
              />
            </Box>
          );
        })}
      </Box>
    </AccordionPanel>
  );
}
