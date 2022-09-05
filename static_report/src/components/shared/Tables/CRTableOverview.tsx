import { Text, Heading, Flex, Icon } from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';

import { SaferTableSchema, zReport, ZTableSchema } from '../../../types';

type Props = {
  baseTable?: SaferTableSchema;
  targetTable?: SaferTableSchema;
};

export function CRTableOverview({ baseTable, targetTable }: Props) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  return (
    <Flex gap={1} direction={'column'} mb={8}>
      <Text color="gray.500">Table</Text>
      <Heading fontSize={24}>
        <Flex alignItems="center">
          <Icon as={FiGrid} mr={1} />
          {targetTable?.name}
        </Flex>
      </Heading>
      <Text fontSize="sm">{targetTable?.description}</Text>
    </Flex>
  );
}
