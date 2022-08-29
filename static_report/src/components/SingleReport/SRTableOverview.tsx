import { Flex, Heading, Text, Icon } from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';

import { TableSchema } from '../../sdlc/single-report-schema';
import { zReport, ZTableSchema } from '../../types';

type Props = { table: TableSchema };

export function SRTableOverview({ table }: Props) {
  zReport(ZTableSchema.safeParse(table));

  return (
    <Flex direction="column" gap={1} mb={8}>
      <Text color="gray.500">Table</Text>
      <Heading fontSize={24}>
        <Flex alignItems="center">
          <Icon as={FiGrid} mr={1} />
          {table.name}
        </Flex>
      </Heading>
      <Text fontSize="sm">{table.description}</Text>
    </Flex>
  );
}
