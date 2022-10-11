import { Flex, FlexProps, Text } from '@chakra-ui/react';
interface Props {
  passed?: number;
  failed?: number;
}
export function AssertionStatusSummary({
  passed = 0,
  failed = 0,
  ...props
}: Props & FlexProps) {
  return (
    <Flex gap={2} {...props}>
      Passed:
      <Text as={'span'} fontWeight={700}>
        {passed}
      </Text>
      Failed:
      <Text as={'span'} fontWeight={700}>
        {failed}
      </Text>
    </Flex>
  );
}
