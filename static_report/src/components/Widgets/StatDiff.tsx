import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import { Text } from '@chakra-ui/react';
import { DbtNode } from '../../lib';
import { getStatDiff } from '../LineageGraph/util';

type StatDiffProps = {
  base?: Partial<DbtNode>;
  target?: Partial<DbtNode>;
  stat: 'execution_time' | 'row_count' | 'failed_test' | 'all_test';
  isActive?: boolean;
  reverseColor?: boolean;
};

export default function StatDiff({
  base,
  target,
  stat,
  isActive,
  reverseColor = false,
}: StatDiffProps) {
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
  } else if (stat === 'failed_test') {
    statResult = {
      statValue: 0,
      statValueF: '0',
      statDiff: 3,
      statDiffF: '3',
    };
  } else if (stat === 'all_test') {
    statResult = {
      statValue: 0,
      statValueF: '0',
      statDiff: 3,
      statDiffF: '3',
    };
  }

  const { statValue, statValueF, statDiff, statDiffF } = statResult;

  let diffColor;
  if (!reverseColor && statDiff) {
    // green
    diffColor = isActive ? 'green.200' : 'green.500';
  } else {
    // red
    diffColor = isActive ? 'white' : 'red.500';
  }

  return (
    <Text fontWeight="bold" textAlign="right" fontSize="sm">
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
