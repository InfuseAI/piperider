import { Flex, Grid, Text, GridItem, Box, Icon } from '@chakra-ui/react';
import { FiArrowRight, FiChevronRight } from 'react-icons/fi';

import {
  CRBaseTableAssertionsSummary,
  CRTargetTableAssertionsSummary,
} from './CRTableListAssertions';
import { ColumnName } from '../ColumnName';
import type {
  AssertionTest,
  ColumnSchema,
} from '../../../../../sdlc/single-report-schema';
import { HistogramChart } from '../../../Charts/HistogramChart';
import { Link } from 'wouter';

function getAssertions(assertions: AssertionTest[]) {
  const total = assertions.length;
  const failed = assertions.reduce((acc, test) => {
    if (test.status === 'failed') {
      acc++;
    }
    return acc;
  }, 0);
  const passed = total - failed;

  return {
    total,
    passed,
    failed,
  };
}

interface Props {
  name: string;
  tableName: string;
  icon: any;
  baseColAssertions: AssertionTest[];
  targetColAssertions: AssertionTest[];
  columnDatum: {
    base?: ColumnSchema;
    target?: ColumnSchema;
  };
}
export function CRTableListColumnItem({
  name,
  icon,
  tableName,
  baseColAssertions,
  targetColAssertions,
  columnDatum,
}: Props) {
  const baseAssertions = getAssertions(baseColAssertions);
  const targetAssertions = getAssertions(targetColAssertions);

  return (
    <Link href={`/tables/${tableName}/columns/${name}`}>
      <Grid
        key={name}
        templateColumns="205px 2.3fr 1.5fr 2rem"
        alignItems="center"
        p={3}
        _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
        data-cy="cr-table-list-column-item"
      >
        <GridItem>
          <ColumnName name={name} icon={icon} />
        </GridItem>

        <GridItem>
          <Flex gap={4} width="calc(100% - 50px)" height="80px">
            <Box width="50%">
              {columnDatum?.base ? (
                <HistogramChart hideAxis data={columnDatum.base} />
              ) : (
                <NoData />
              )}
            </Box>
            <Box width="50%">
              {columnDatum?.target ? (
                <HistogramChart hideAxis data={columnDatum.target} />
              ) : (
                <NoData />
              )}
            </Box>
          </Flex>
        </GridItem>

        <GridItem>
          {baseAssertions.total > 0 && targetAssertions.total > 0 ? (
            <Flex gap={2} color="gray.500" alignItems="center">
              <CRBaseTableAssertionsSummary {...baseAssertions} />
              <Icon as={FiArrowRight} />
              <CRTargetTableAssertionsSummary
                {...targetAssertions}
                baseAssertionsFailed={baseAssertions.failed}
                assertionsDiff={targetAssertions.total - baseAssertions.total}
              />
            </Flex>
          ) : (
            <Text color="gray.500">No assertions</Text>
          )}
        </GridItem>

        <GridItem>
          <Flex alignItems="center">
            <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
          </Flex>
        </GridItem>
      </Grid>
    </Link>
  );
}

function NoData() {
  return (
    <Text mt={7} color="gray.500">
      No data available
    </Text>
  );
}
