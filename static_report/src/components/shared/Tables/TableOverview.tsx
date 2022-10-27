import { Text, Grid, GridItem, BoxProps } from '@chakra-ui/react';

import { SaferTableSchema } from '../../../types';
import { DupedTableRowsWidget } from '../Widgets/DupedTableRowsWidget';
import { NO_DESCRIPTION_MSG } from './constant';
import { TableGeneralStats } from './TableMetrics/TableGeneralStats';

interface Props {
  tableDatum?: SaferTableSchema;
}

export function TableOverview({ tableDatum, ...props }: Props & BoxProps) {
  return (
    <Grid mb={8} gap={8}>
      <GridItem colSpan={1}>
        <TableGeneralStats tableDatum={tableDatum} />
      </GridItem>
      <GridItem>
        <DupedTableRowsWidget tableDatum={tableDatum} />
      </GridItem>
    </Grid>
  );
}
export function TableDescription({ description }: { description?: string }) {
  return (
    <Text
      fontSize="sm"
      border={'1px solid lightgray'}
      p={2}
      h={'12em'}
      overflow={'auto'}
    >
      {description || NO_DESCRIPTION_MSG}
    </Text>
  );
}
