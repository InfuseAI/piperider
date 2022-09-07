import { Text, Heading, Flex, Icon } from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';

import { SaferTableSchema, zReport, ZTableSchema } from '../../../types';

type Props = {
  baseTable?: SaferTableSchema;
  targetTable?: SaferTableSchema;
};

export function TableOverview({ baseTable, targetTable }: Props) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const fallback = baseTable || targetTable;

  return (
    <Flex gap={1} direction={'column'} mb={8}>
      <Text color="gray.500">Table</Text>
      <Heading fontSize={24}>
        <Flex alignItems="center">
          <Icon as={FiGrid} mr={1} />
          {fallback?.name}
        </Flex>
      </Heading>
      <Text fontSize="sm">{fallback?.description}</Text>
    </Flex>
  );
}
