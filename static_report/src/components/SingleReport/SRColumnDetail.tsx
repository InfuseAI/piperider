import { Grid, GridItem, Text, Icon } from '@chakra-ui/react';

import { ColumnName } from '../shared/TableList/ColumnName';
import { SRAssertionsSummaryLabel } from './SRAssertionsSummaryLabel';
import { FiChevronsRight } from 'react-icons/fi';
import type { AssertionTest } from '../../sdlc/single-report-schema';

export function SRColumnDetail({
  name,
  icon,
  colAssertions,
}: {
  name: string;
  icon: any;
  colAssertions: AssertionTest[] | undefined;
}) {
  return (
    <Grid
      key={name}
      templateColumns="207px 2.5fr 1fr 2rem"
      alignItems="center"
      p={3}
      _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
    >
      <GridItem>
        <ColumnName name={name} icon={icon} />
      </GridItem>

      <GridItem>TODO</GridItem>

      <GridItem>
        {!colAssertions ? (
          <Text color="gray.500">no assertions</Text>
        ) : (
          <SRAssertionsSummaryLabel assertions={colAssertions} />
        )}
      </GridItem>

      <GridItem>
        <Icon as={FiChevronsRight} color="piperider.500" boxSize={6} />
      </GridItem>
    </Grid>
  );
}
