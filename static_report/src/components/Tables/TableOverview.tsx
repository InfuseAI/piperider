import { Grid, GridItem, BoxProps } from '@chakra-ui/react';

import { SaferTableSchema } from '../../types';
import { DupedTableRowsWidget } from '../Widgets/DupedTableRowsWidget';
import { TableGeneralStats } from './TableMetrics/TableGeneralStats';

interface Props {
  tableDatum?: SaferTableSchema;
}

export function TableOverview({ tableDatum, ...props }: Props & BoxProps) {
  return (
    <Grid mb={8} gap={8} {...props}>
      <GridItem colSpan={1}>
        <TableGeneralStats tableDatum={tableDatum} />
      </GridItem>
      <GridItem>
        <DupedTableRowsWidget tableDatum={tableDatum} />
      </GridItem>
    </Grid>
  );
}
