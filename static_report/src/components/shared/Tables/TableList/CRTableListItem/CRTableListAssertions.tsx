import { Flex, Text, Center, Icon } from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';
import { AssertionLabel, AssertionsLabelIcon } from '../../../Assertions';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../../utils/formatters';

interface Props {
  baseAssertionTotal: number;
  baseAssertionFailed: number;
  targetAssertionTotal: number;
  targetAssertionFailed: number;
}
/**
 * SR = e.g. <checkmark> All of 10
 * CR = e.g. All Passed|Failed / 10 total -> 10/10
 */
export function CRTableListAssertions({
  baseAssertionFailed,
  baseAssertionTotal,
  targetAssertionFailed,
  targetAssertionTotal,
}: Props) {
  return (
    <Flex gap={2} color="gray.500" alignItems="center" bg={'orange.300'}>
      {/* base assertions */}
      <Flex gap={1} alignItems="center">
        <CRBaseTableAssertion
          total={baseAssertionTotal}
          failed={baseAssertionFailed}
        />
        <Text as="span">/</Text>
        <Text as="span" width="60px">
          {formatColumnValueWith(baseAssertionTotal, formatNumber)} total
        </Text>
      </Flex>

      <Icon as={FiArrowRight} />

      {/* target assertions */}
      <Flex gap={1} alignItems="center">
        <CRTargetTableAssertion
          total={targetAssertionTotal}
          failed={targetAssertionFailed}
          failedDelta={targetAssertionFailed - baseAssertionFailed}
        />
        <Text as="span">/</Text>
        <CRTargetTableAssertionsDelta
          baseAssertions={baseAssertionTotal}
          targetAssertions={targetAssertionTotal}
        />
      </Flex>
    </Flex>
  );
}

export function CRBaseTableAssertion({
  total,
  failed,
}: {
  total: number;
  failed: number;
}) {
  if (total === 0) {
    return (
      <Text as="span" color="gray.500">
        none
      </Text>
    );
  }

  if (total > 0 && failed === 0) {
    return (
      <Text as="span" color="#2CAA00" width="80px">
        All Passed
      </Text>
    );
  }

  return (
    <Text as="span" color="#F60059" width="80px">
      {formatColumnValueWith(failed, formatNumber)} failures
    </Text>
  );
}

export function CRTargetTableAssertion({
  total,
  failed,
  failedDelta,
}: {
  total: number;
  failed: number;
  failedDelta: number;
}) {
  if (total === 0) {
    return (
      <Text as="span" color="gray.500">
        none
      </Text>
    );
  }

  if (failedDelta !== 0) {
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

export function CRTargetTableAssertionsDelta({
  baseAssertions,
  targetAssertions,
}: {
  baseAssertions: number;
  targetAssertions: number;
}) {
  const delta = targetAssertions - baseAssertions;
  const isGreaterThanZero = delta > 0;

  if (targetAssertions === 0) {
    return <Text as="span">none</Text>;
  }

  return (
    <Center gap={1}>
      {delta !== 0 ? <AssertionsLabelIcon delta={delta} /> : null}
      <Text as="span" color={isGreaterThanZero ? 'black' : 'inherit'}>
        {formatColumnValueWith(targetAssertions, formatNumber)}
      </Text>
    </Center>
  );
}

export function CRTargetTableAssertionsSummary({
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
        <ComparisonLabelIcon
          isPassed={isPassed}
          isFailedEqual={isFailedEqual}
          isMoreFailed={isMoreFailed}
        />
      }
    />
  );
}

function ComparisonLabelIcon({
  isPassed,
  isFailedEqual,
  isMoreFailed,
}: {
  isPassed: boolean;
  isFailedEqual: boolean;
  isMoreFailed: boolean;
}) {
  return (
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
