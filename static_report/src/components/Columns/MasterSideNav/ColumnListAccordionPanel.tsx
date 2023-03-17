import { AccordionPanel, Box } from '@chakra-ui/react';
import { Comparable } from '../../../types';
import { CompColEntryItem } from '../../../utils';
import { ColumnDetailListItem } from './ColumnDetailListItem';

/**
 * ColumnItemList: Accordion UI Child Body
 */
interface ColumnListAccordionPanelProps extends Comparable {
  tableName: string;
  compColList?: CompColEntryItem[];
  indexedTableName: string;
}
export function ColumnListAccordionPanel({
  tableName,
  compColList = [],
  singleOnly,
}: ColumnListAccordionPanelProps) {
  return (
    <AccordionPanel>
      <Box>
        {compColList.map(([colKey, { base, target }]) => {
          return (
            <Box key={colKey}>
              {/* LIST - Columns */}
              <ColumnDetailListItem
                tableName={tableName}
                baseColumnDatum={base}
                targetColumnDatum={target}
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
