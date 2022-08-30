import { Flex, Text, Center, Icon } from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';
import isString from 'lodash/isString';
import partial from 'lodash/partial';

import { getComparisonAssertions } from '../../../utils/assertion';
import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';
import type { ComparisonReportSchema } from '../../../types';

const getAssertionValue = partial((value: string | number) =>
  isString(value) ? 0 : value,
);

export function CRTableListAssertions({
  data,
  reportName,
}: {
  data: ComparisonReportSchema;
  reportName: string;
}) {
  const [baseOverview, targetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'piperider',
  });
  const [dbtBaseOverview, dbtTargetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'dbt',
  });

  const baseOverviewAssertions =
    baseOverview.tests.length + dbtBaseOverview.tests.length;
  const baseOverviewFailed = getAssertionValue(baseOverview.failed);
  const dbtBaseOverviewFailed = getAssertionValue(dbtBaseOverview.failed);
  const baseFailed = baseOverviewFailed + dbtBaseOverviewFailed;

  const targetOverviewAssertions =
    targetOverview.tests.length + dbtTargetOverview.tests.length;
  const targetOverviewFailed = getAssertionValue(targetOverview.failed);
  const dbtTargetOverviewFailed = getAssertionValue(dbtTargetOverview.failed);
  const targetFailed = targetOverviewFailed + dbtTargetOverviewFailed;

  return (
    <Flex gap={2} color="gray.500" alignItems="center">
      {/* base assertions */}
      <Flex gap={1} alignItems="center">
        <CRBaseTableAssertion
          total={baseOverviewAssertions}
          failed={baseFailed}
        />
        <Text as="span">/</Text>
        <Text as="span" width="60px">
          {formatColumnValueWith(baseOverviewAssertions, formatNumber)} total
        </Text>
      </Flex>

      <Icon as={FiArrowRight} />

      {/* target assertions */}
      <Flex gap={1} alignItems="center">
        <CRTargetTableAssertion
          total={targetOverviewAssertions}
          failed={targetFailed}
          failedDifference={targetFailed - baseFailed}
        />
        <Text as="span">/</Text>
        <CRTargetTableAssertionsDifference
          baseAssertions={baseOverviewAssertions}
          targetAssertions={targetOverviewAssertions}
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
  failedDifference,
}: {
  total: number;
  failed: number;
  failedDifference: number;
}) {
  if (total === 0) {
    return (
      <Text as="span" color="gray.500">
        none
      </Text>
    );
  }

  if (failedDifference < 0) {
    return (
      <Center gap={1} color="#F60059">
        <Icon as={FiArrowDownCircle} boxSize={4} />
        <Text as="span">
          {formatColumnValueWith(Math.abs(failedDifference), formatNumber)}
        </Text>
      </Center>
    );
  } else if (failedDifference > 0) {
    return (
      <Center gap={1} color="#F60059">
        <Icon as={FiArrowUpCircle} boxSize={4} />
        <Text as="span">
          {formatColumnValueWith(failedDifference, formatNumber)}
        </Text>
      </Center>
    );
  }

  // When `failedDifference = 0`, check `failed` number if is `0` then rendering `total`
  return (
    <Text as="span">
      {failed === 0
        ? formatColumnValueWith(total, formatNumber)
        : formatColumnValueWith(failed, formatNumber)}
    </Text>
  );
}

export function CRTargetTableAssertionsDifference({
  baseAssertions,
  targetAssertions,
}: {
  baseAssertions: number;
  targetAssertions: number;
}) {
  const difference = targetAssertions - baseAssertions;
  const isGreaterThanZero = difference > 0;

  if (targetAssertions === 0) {
    return <Text as="span">none</Text>;
  }

  return (
    <Center gap={1}>
      {difference !== 0 ? (
        <Icon
          as={isGreaterThanZero ? FiArrowUpCircle : FiArrowDownCircle}
          color="black"
          boxSize={4}
        />
      ) : null}
      <Text as="span" color={isGreaterThanZero ? 'black' : 'inherit'}>
        {formatColumnValueWith(targetAssertions, formatNumber)}
      </Text>
    </Center>
  );
}

export function CRBaseTableAssertionsSummary({
  total,
  failed,
}: {
  total: number;
  failed: number;
}) {
  const isPassed = failed === 0;

  return (
    <Flex gap={1} alignItems="center">
      <Flex
        alignItems="center"
        borderRadius="md"
        bgColor={isPassed ? '#DEFFEB' : '#FFE8F0'}
        color={isPassed ? '#1F7600' : '#F60059'}
        py={0.5}
        px={1.5}
      >
        <Icon as={isPassed ? FiCheck : FiX} boxSize={4} />
        <Text as="span">{isPassed ? 'All' : failed}</Text>
      </Flex>
      <Text as="span" color="gray.500">
        of
      </Text>
      <Text as="span">{formatColumnValueWith(total, formatNumber)}</Text>
    </Flex>
  );
}

export function CRTargetTableAssertionsSummary({
  total,
  failed,
  baseAssertionsFailed,
  assertionsDiff,
}: {
  total: number;
  failed: number;
  baseAssertionsFailed: number;
  assertionsDiff: number;
}) {
  const isFailedEqual = failed === baseAssertionsFailed;
  const isMoreFailed = failed - baseAssertionsFailed > 0;
  const isPassed = failed === 0;

  if (total === 0) {
    return (
      <Center>
        {assertionsDiff !== 0 && (
          <Icon as={FiArrowDownCircle} color="black" boxSize={5} />
        )}
        <Text as="span" color="black">
          none
        </Text>
      </Center>
    );
  }

  return (
    <Flex gap={1} alignItems="center">
      <Flex
        alignItems="center"
        borderRadius="md"
        bgColor={isPassed ? '#DEFFEB' : '#FFE8F0'}
        color={isPassed ? '#1F7600' : '#F60059'}
        py={0.5}
        px={1.5}
        gap={1}
      >
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
        <Text as="span">{isPassed ? 'All' : failed}</Text>
      </Flex>
      <Text as="span" color="gray.500">
        of
      </Text>
      <Center gap={1}>
        {assertionsDiff !== 0 && (
          <Icon
            as={assertionsDiff > 0 ? FiArrowUpCircle : FiArrowDownCircle}
            color="black"
            boxSize={5}
          />
        )}
        <Text as="span" color={assertionsDiff > 0 ? 'black' : 'inherit'}>
          {formatColumnValueWith(total, formatNumber)}
        </Text>
      </Center>
    </Flex>
  );
}
