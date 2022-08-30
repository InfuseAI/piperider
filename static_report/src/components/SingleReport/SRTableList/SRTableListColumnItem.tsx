import { Flex, Grid, GridItem, Text } from '@chakra-ui/react';

import { ColumnName } from '../../shared/TableList/ColumnName';
import { SRTableListAssertionsSummary } from './SRTableListAssertionsSummary';
import { HistogramChart } from '../../shared/Charts/HistogramChart';
import type {
  AssertionTest,
  ColumnSchema,
} from '../../../sdlc/single-report-schema';

export function SRTableListColumnItem({
  name,
  columnDatum,
  icon,
  colAssertions,
}: {
  name: string;
  columnDatum: ColumnSchema;
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
        <Flex width="calc(100% - 50px)" height="80px">
          <HistogramChart hideAxis data={columnDatum} />
        </Flex>
      </GridItem>

      <GridItem>
        {!colAssertions ? (
          <Text color="gray.500">No assertions</Text>
        ) : (
          <SRTableListAssertionsSummary assertions={colAssertions} />
        )}
      </GridItem>

      {/* TODO: when columns detail page remove comment */}
      <GridItem>
        {/* <Icon as={FiChevronRight} color="piperider.500" boxSize={6} /> */}
      </GridItem>
    </Grid>
  );
}
