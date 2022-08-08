import { Flex, Heading, Text } from '@chakra-ui/react';
import { TableSchema } from '../../sdlc/single-report-schema';
import { zReport, ZTableSchema } from '../../types';
import { getReportAggregateAssertions } from '../../utils/assertion';
import { formatColumnValueWith, formatNumber } from '../../utils/formatters';

type Props = { table: TableSchema };

export function SRTableOverview({ table }: Props) {
  zReport(ZTableSchema.safeParse(table));
  const overview = getReportAggregateAssertions(
    table.piperider_assertion_result,
    table.dbt_assertion_result,
  );

  return (
    <Flex direction="column" gap={4} mb={8}>
      <Heading size="lg">Overview</Heading>
      <Text>
        Table:{' '}
        <Text as="span" fontWeight={700}>
          {table.name}
        </Text>
      </Text>
      <Text>
        Rows:{' '}
        <Text as="span" fontWeight={700}>
          {formatColumnValueWith(table.row_count, formatNumber)}
        </Text>
      </Text>
      <Text>
        Columns:{' '}
        <Text as="span" fontWeight={700}>
          {formatColumnValueWith(table.col_count, formatNumber)}
        </Text>
      </Text>
      <Text>
        Test Status:{' '}
        <Text as={'span'} fontWeight={700}>
          {overview.passed}
        </Text>{' '}
        Passed,{' '}
        <Text
          as="span"
          fontWeight={700}
          color={overview.failed > 0 ? 'red.500' : 'inherit'}
        >
          {overview.failed}
        </Text>{' '}
        Failed
      </Text>
    </Flex>
  );
}
