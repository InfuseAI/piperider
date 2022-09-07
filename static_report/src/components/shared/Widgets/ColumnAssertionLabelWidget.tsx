import { Flex, Text, Icon } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';

export type ColumnAssertionLabelWidgetProps = {
  total: number;
  failed: number;
  isPassed: boolean;
  isComparison?: boolean;
  icon?: ReactNode;
  comparisonDelta?: ReactNode;
};

export function ColumnAssertionLabelWidget({
  isPassed,
  total,
  failed,
  ...props
}: ColumnAssertionLabelWidgetProps) {
  return (
    <Flex gap={2} alignItems="center">
      <Flex
        alignItems="center"
        borderRadius="md"
        bgColor={isPassed ? '#DEFFEB' : '#FFE8F0'}
        color={isPassed ? '#1F7600' : '#F60059'}
        py={0.5}
        px={1.5}
      >
        {props?.icon ? (
          props.icon
        ) : (
          <Icon as={isPassed ? FiCheck : FiX} boxSize={4} />
        )}
        <Text as="span">{isPassed ? 'All' : failed}</Text>
      </Flex>
      <Text as="span" color="gray.500">
        of
      </Text>
      {props?.comparisonDelta ? (
        props.comparisonDelta
      ) : (
        <Text as="span">{formatColumnValueWith(total, formatNumber)}</Text>
      )}
    </Flex>
  );
}
