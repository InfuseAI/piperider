import { Flex, Text } from '@chakra-ui/react';
interface Props {
  added: number;
  deleted: number;
  changed: number;
}
export function ColumnSchemaDeltaSummary({ added, deleted, changed }: Props) {
  return (
    <Flex gap={2}>
      ( Added:
      <Text as={'span'} fontWeight={700}>
        {added}
      </Text>
      Deleted:
      <Text as={'span'} fontWeight={700}>
        {deleted}
      </Text>
      Changed:
      <Text as={'span'} fontWeight={700}>
        {changed}
      </Text>
      )
    </Flex>
  );
}
