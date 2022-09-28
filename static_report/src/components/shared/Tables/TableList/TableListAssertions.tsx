import { Flex, Text, Center, Icon } from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';
import { AssertionLabel, AssertionsLabelIcon } from '../../Assertions';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { NO_VALUE } from '../../Columns';

interface Props {
  baseAssertionTotal: number | string;
  baseAssertionFailed: number | string;
  targetAssertionTotal: number | string;
  targetAssertionFailed: number | string;
}
/**
 * SR = e.g. <checkmark> All of 10
 * CR = e.g. All Passed|Failed / 10 total -> 10/10
 */
export function TableListAssertionSummary({
  baseAssertionFailed,
  baseAssertionTotal,
  targetAssertionFailed,
  targetAssertionTotal,
}: Props) {
  const failedDelta =
    typeof baseAssertionFailed === 'number' &&
    typeof targetAssertionFailed === 'number'
      ? targetAssertionFailed - baseAssertionFailed
      : NO_VALUE;
  return (
    <Flex gap={2} color="gray.500" alignItems="center">
      {/* base assertions */}
      <Flex gap={1} alignItems="center">
        <BaseTableAssertionSummary
          total={baseAssertionTotal}
          failed={baseAssertionFailed}
        />
        <Text as="span">/</Text>
        <Text as="span">
          {formatColumnValueWith(baseAssertionTotal, formatNumber)}
        </Text>
      </Flex>

      <Icon as={FiArrowRight} />

      {/* target assertions */}
      <Flex gap={1} alignItems="center">
        <TargetTableAssertion
          total={targetAssertionTotal}
          failed={targetAssertionFailed}
          failedDelta={failedDelta}
        />
        <Text as="span">/</Text>
        <TargetTableAssertionsDelta
          baseAssertions={baseAssertionTotal}
          targetAssertions={targetAssertionTotal}
        />
      </Flex>
    </Flex>
  );
}

function BaseTableAssertionSummary({
  total,
  failed,
}: {
  total: number | string;
  failed: number | string;
}) {
  if (total === 0) {
    return (
      <Text as="span" color="gray.500">
        0
      </Text>
    );
  }

  if (total > 0 && failed === 0) {
    return (
      <Text as="span" color="#2CAA00">
        All Passed
      </Text>
    );
  }

  if (failed > 0)
    return (
      <Text as="span" color="#F60059">
        {formatColumnValueWith(failed, formatNumber)}
      </Text>
    );
  return <Text>{NO_VALUE}</Text>;
}

function TargetTableAssertion({
  total,
  failed,
  failedDelta,
}: {
  total: number | string;
  failed: number | string;
  failedDelta: number | string;
}) {
  if (total === 0) {
    return (
      <Text as="span" color="gray.500">
        none
      </Text>
    );
  }

  if (failedDelta !== 0 && typeof failedDelta === 'number') {
    return (
      <Center gap={1} color="#F60059">
        <AssertionsLabelIcon delta={failedDelta} />
        <Text as="span">
          {formatColumnValueWith(Math.abs(failedDelta), formatNumber)}
        </Text>
      </Center>
    );
  }

  // When `failedDelta = 0`, check `failed` number if is `0` then rendering `total`
  return (
    <Text as="span">
      {failed === 0
        ? formatColumnValueWith(total, formatNumber)
        : formatColumnValueWith(failed, formatNumber)}
    </Text>
  );
}

function TargetTableAssertionsDelta({
  baseAssertions,
  targetAssertions,
}: {
  baseAssertions: number | string;
  targetAssertions: number | string;
}) {
  const delta =
    typeof baseAssertions === 'number' && typeof targetAssertions === 'number'
      ? targetAssertions - baseAssertions
      : NO_VALUE;
  const isGreaterThanZero = delta > 0;

  if (targetAssertions === 0) {
    return <Text as="span">none</Text>;
  }

  return (
    <Center gap={1}>
      {typeof delta === 'number' && delta !== 0 ? (
        <AssertionsLabelIcon delta={delta} />
      ) : null}
      <Text as="span" color={isGreaterThanZero ? 'black' : 'inherit'}>
        {formatColumnValueWith(targetAssertions, formatNumber)}
      </Text>
    </Center>
  );
}

export function TargetTableAssertionsSummary({
  total,
  failed,
  baseAssertionsFailed,
  delta,
}: {
  total: number;
  failed: number;
  baseAssertionsFailed: number;
  delta: number;
}) {
  const isFailedEqual = failed === baseAssertionsFailed;
  const isMoreFailed = failed - baseAssertionsFailed > 0;
  const isPassed = failed === 0;

  if (total === 0) {
    return (
      <Center>
        {delta !== 0 && <AssertionsLabelIcon delta={delta} />}
        <Text as="span" color="black">
          none
        </Text>
      </Center>
    );
  }

  return (
    <AssertionLabel
      singleOnly={false}
      total={total}
      failed={failed}
      comparisonDelta={<ComparisonDelta delta={delta} total={total} />}
      icon={
        <Icon
          boxSize={5}
          as={
            isPassed
              ? FiCheck
              : isFailedEqual
              ? FiX
              : isMoreFailed
              ? FiArrowUpCircle
              : FiArrowDownCircle
          }
        />
      }
    />
  );
}

function ComparisonDelta({ delta, total }: { delta: number; total: number }) {
  return (
    <Center gap={1}>
      {delta !== 0 && <AssertionsLabelIcon delta={delta} />}
      <Text as="span" color={delta > 0 ? 'black' : 'inherit'}>
        {formatColumnValueWith(total, formatNumber)}
      </Text>
    </Center>
  );
}
