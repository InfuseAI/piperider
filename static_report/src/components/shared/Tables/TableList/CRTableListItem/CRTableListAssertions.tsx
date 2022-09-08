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

import { AssertionsLabelIcon } from '../../../Assertions/AssertionsLabelIcon';
import { ColumnAssertionLabel } from '../../../Assertions/ColumnAssertionLabel';
import { getComparisonAssertions } from '../../../../../utils/assertion';
import type { ComparisonReportSchema } from '../../../../../types';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../../utils/formatters';

const getAssertionValue = partial((value: string | number) =>
  isString(value) ? 0 : value,
);

export function CRTableListAssertions({
  data,
  tableName,
}: {
  data: ComparisonReportSchema;
  tableName: string;
}) {
  const [baseOverview, targetOverview] = getComparisonAssertions({
    data,
    tableName,
    type: 'piperider',
  });
  const [dbtBaseOverview, dbtTargetOverview] = getComparisonAssertions({
    data,
    tableName,
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
          failedDelta={targetFailed - baseFailed}
        />
        <Text as="span">/</Text>
        <CRTargetTableAssertionsDelta
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

export function CRBaseTableAssertionsSummary({
  total,
  failed,
}: {
  total: number;
  failed: number;
}) {
  return (
    <ColumnAssertionLabel singleOnly={false} total={total} failed={failed} />
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
    <ColumnAssertionLabel
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
