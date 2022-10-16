import { Text, Center, Icon, Grid } from '@chakra-ui/react';
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

interface Props {
  baseAssertionTotal?: number | string;
  baseAssertionFailed?: number | string;
  targetAssertionTotal?: number | string;
  targetAssertionFailed?: number | string;
}

export function TableListAssertionSummary({
  baseAssertionFailed,
  baseAssertionTotal,
  targetAssertionFailed,
  targetAssertionTotal,
}: Props) {
  return (
    <Grid
      gap={3}
      templateColumns={'1fr 1em 1fr'}
      alignItems={'center'}
      color="gray.500"
    >
      <AssertionLabel total={baseAssertionTotal} failed={baseAssertionFailed} />

      <Icon as={FiArrowRight} />

      <AssertionLabel
        total={targetAssertionTotal}
        failed={targetAssertionFailed}
      />
    </Grid>
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
