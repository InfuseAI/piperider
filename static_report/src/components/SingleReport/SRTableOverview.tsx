import { Flex, Heading, Text } from '@chakra-ui/react';
import { TableSchema } from '../../sdlc/single-report-schema';
import { formatNumber, ReportAsserationStatusCounts } from '../../utils';

type Props = { table: TableSchema; overview: ReportAsserationStatusCounts };
export function SRTableOverview({ table, overview }: Props) {
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
