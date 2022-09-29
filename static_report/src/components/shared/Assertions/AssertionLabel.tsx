import { Flex, Text, Icon } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';
import type { Comparable } from '../../../types';
import { NO_VALUE } from '../Columns';

export interface AssertionLabelProps extends Comparable {
  total: number | string;
  failed: number | string;
  icon?: ReactNode;
  comparisonDelta?: ReactNode;
}

export function AssertionLabel({
  total,
  failed,
  ...props
}: AssertionLabelProps) {
  const isPassed = failed === 0;
  const hasNoAssertions = total === 0;
  const hasBothStatusCounts =
    typeof total === 'number' && typeof failed === 'number';
  return (
    <Flex alignItems="center" justifyContent="space-between">
      {hasBothStatusCounts && !hasNoAssertions ? (
        <Flex gap={2}>
          <Flex
            alignItems="center"
            borderRadius="md"
            bgColor={isPassed ? '#DEFFEB' : '#FFE8F0'}
            color={isPassed ? '#1F7600' : '#F60059'}
            py={0.5}
            px={1.5}
          >
            {!props?.singleOnly && props?.icon ? (
              props.icon
            ) : (
              <Icon as={isPassed ? FiCheck : FiX} boxSize={4} />
            )}
            <Text as="span">{isPassed ? 'All' : failed}</Text>
          </Flex>

          <Text as="span" color="gray.500">
            of
          </Text>

          {!props?.singleOnly && props?.comparisonDelta ? (
            props.comparisonDelta
          ) : (
            <Text as="span">{formatColumnValueWith(total, formatNumber)}</Text>
          )}
        </Flex>
      ) : (
        <Text color="gray.500">{NO_VALUE}</Text>
      )}
    </Flex>
  );
}
