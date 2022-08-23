import { Flex, Grid, GridItem, Text, Icon } from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';

import { ColumnName } from '../shared/TableList/ColumnName';
import { SRAssertionsSummaryLabel } from './SRAssertionsSummaryLabel';
import { HistogramChart } from '../shared/Charts/HistogramChart';
import type {
  AssertionTest,
  ColumnSchema,
} from '../../sdlc/single-report-schema';

export function SRColumnDetail({
  name,
  data,
  icon,
  colAssertions,
}: {
  name: string;
  data: ColumnSchema;
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

      <GridItem>
        <Flex height="100px">
          <HistogramChart data={data} />
        </Flex>
      </GridItem>

      <GridItem>
        {!colAssertions ? (
          <Text color="gray.500">no assertions</Text>
        ) : (
          <SRAssertionsSummaryLabel assertions={colAssertions} />
        )}
      </GridItem>

      <GridItem>
        <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
      </GridItem>
    </Grid>
  );
}
