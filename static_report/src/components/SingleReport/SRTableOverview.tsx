import { Flex, Heading, Text } from '@chakra-ui/react';
import { TableSchema } from '../../sdlc/single-report-schema';
import { ZTableSchema } from '../../types';
import { getReportAggregateAssertions } from '../../utils/assertion';
import { formatNumber } from '../../utils/formatters';

type Props = { table: TableSchema };

export function SRTableOverview({ table }: Props) {
  ZTableSchema.parse(table);
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
          {formatNumber(table.row_count)}
        </Text>
      </Text>
      <Text>
        Columns:{' '}
        <Text as="span" fontWeight={700}>
          {formatNumber(table.col_count)}
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
