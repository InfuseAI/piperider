import { Flex, FlexProps, Text } from '@chakra-ui/react';
interface Props {
  added?: number;
  deleted?: number;
  changed?: number;
}
export function ColumnSchemaDeltaSummary({
  added = 0,
  deleted = 0,
  changed = 0,
  ...props
}: Props & FlexProps) {
  return (
    <Flex gap={2} {...props}>
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
