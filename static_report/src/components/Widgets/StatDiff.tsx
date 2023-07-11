import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import { Text } from '@chakra-ui/react';
import { DbtNode } from '../../lib';
import { getStatDiff } from '../LineageGraph/util';

type StatDiffProps = {
  base?: Partial<DbtNode>;
  target?: Partial<DbtNode>;
  stat: 'execution_time' | 'row_count' | 'failed_test' | 'all_test';
  isActive?: boolean;
};

export function dbtNodeStatDiff({ base, target, stat }: StatDiffProps) {
  let statResult: ReturnType<typeof getStatDiff> = {};

  if (stat === 'execution_time') {
    statResult = getStatDiff(
      base?.__runResult,
      target?.__runResult,
      'execution_time',
      'duration',
    );
  } else if (stat === 'row_count') {
    statResult = getStatDiff(
      base?.__table,
      target?.__table,
      'row_count',
      'decimal',
    );
  }

  return statResult;
}

export function StatDiff(props: StatDiffProps) {
  const { isActive } = props;
  const statResult = dbtNodeStatDiff(props);

  const { statValueF, statDiff, statDiffF } = statResult;

  let diffColor;
  if (statDiff && statDiff < 0) {
    // green
    diffColor = isActive ? 'white' : 'green.500';
  } else {
    // red
    diffColor = isActive ? 'white' : 'red.500';
  }

  return (
    <Text>
      {statValueF}&nbsp;
      {statDiff ? (
        <Text as="span" color={diffColor}>
          {statDiff < 0 ? <TriangleDownIcon /> : <TriangleUpIcon />}
          {statDiffF}
        </Text>
      ) : (
        <></>
      )}
    </Text>
  );
}
