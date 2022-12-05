import { Icon, Grid } from '@chakra-ui/react';
import { FiArrowRight } from 'react-icons/fi';
import { AssertionPassFailCountLabel } from '../../Assertions';

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
      gap={6}
      templateColumns={'1fr 1em 1fr'}
      alignItems={'center'}
      color="gray.500"
    >
      <AssertionPassFailCountLabel
        total={baseAssertionTotal}
        failed={baseAssertionFailed}
      />

      <Icon as={FiArrowRight} />

      <AssertionPassFailCountLabel
        total={targetAssertionTotal}
        failed={targetAssertionFailed}
      />
    </Grid>
  );
}
