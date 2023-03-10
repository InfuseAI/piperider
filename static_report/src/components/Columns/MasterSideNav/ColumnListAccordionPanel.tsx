import { AccordionPanel, Box } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { Comparable } from '../../../types';
import { CompColEntryItem } from '../../../utils';
import { COLUMN_DETAILS_ROUTE_PATH } from '../../../utils/routes';
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
