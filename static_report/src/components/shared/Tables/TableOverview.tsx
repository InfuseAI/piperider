import { Text, Grid, GridItem, Box, BoxProps } from '@chakra-ui/react';

import { SaferTableSchema, zReport, ZTableSchema } from '../../../types';
import { DupedTableRowsWidget } from '../Widgets/DupedTableRowsWidget';
import { NO_DESCRIPTION_MSG } from './constant';
import { TableGeneralStats } from './TableMetrics/TableGeneralStats';

interface Props {
  tableDatum?: SaferTableSchema;
}

export function TableOverview({ tableDatum, ...props }: Props & BoxProps) {
  zReport(ZTableSchema.safeParse(tableDatum));

  return (
    <Grid mb={8} templateColumns={'1fr 1px 1fr'} {...props}>
      <GridItem gap={2} colSpan={1}>
        <TableGeneralStats tableDatum={tableDatum} />
        <Box height={300} mt={8}>
          <DupedTableRowsWidget tableDatum={tableDatum} />
        </Box>
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
