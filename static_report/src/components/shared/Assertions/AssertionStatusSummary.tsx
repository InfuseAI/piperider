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
      <Text fontWeight={700}>Test Status:</Text>
      <Text as={'span'} fontWeight={700}>
        {passed} Passed,
      </Text>
      <Text as={'span'} fontWeight={700}>
        {failed} Failed
      </Text>
    </Flex>
  );
}
