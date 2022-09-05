import { Flex, Grid, GridItem, Icon, Text } from '@chakra-ui/react';

import { ColumnName } from '../../shared/Tables/TableList/ColumnName';
import { SRTableListAssertionsSummary } from './SRTableListAssertionsSummary';
import { HistogramChart } from '../../shared/Charts/HistogramChart';
import type {
  AssertionTest,
  ColumnSchema,
} from '../../../sdlc/single-report-schema';
import { Link } from 'wouter';
import { FiChevronRight } from 'react-icons/fi';

export function SRTableListColumnItem({
  name,
  icon,
  columnDatum,
  colAssertions,
  tableName,
}: {
  name: string;
  columnDatum: ColumnSchema;
  tableName: string;
  icon: any;
  colAssertions: AssertionTest[] | undefined;
}) {
  return (
    <Link href={`/tables/${tableName}/columns/${name}`}>
      <Grid
        p={3}
        key={name}
        templateColumns="207px 2.5fr 1fr 2rem"
        alignItems="center"
        _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
        data-cy="sr-table-list-column-item"
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

        <GridItem>
          <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
        </GridItem>
      </Grid>
    </Link>
  );
}
