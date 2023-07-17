import { VStack, Box, Icon, Text, Tooltip, Grid } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiInfo } from 'react-icons/fi';
import { CompTableColEntryItem } from '../../lib';
import { ChangeStatusWidget } from '../Widgets/ChangeStatusWidget';

function SummaryText({
  name,
  value,
  tip,
}: {
  name: string;
  value: ReactNode;
  tip?: ReactNode;
}) {
  return (
    <VStack alignItems="flex-start">
      <Text fontSize="sm" color="gray">
        {name}
        {tip && (
          <Tooltip label={tip}>
            <Box display="inline-block">
              <Icon mx={'2px'} as={FiInfo} boxSize={3} />
            </Box>
          </Tooltip>
        )}
      </Text>
      <Text fontSize="l">{value}</Text>
    </VStack>
  );
}

type Props = {
  tableColumnsOnly: CompTableColEntryItem[];
  noImpacted: boolean;
};

export function ChangeSummary({ tableColumnsOnly, noImpacted }: Props) {
  const { total, added, removed, modified, impacted, implicit } =
    tableColumnsOnly.reduce(
      (acc, [key, { base, target }, { changeStatus, impacted }]) => {
        return {
          total: acc.total + (target ? 1 : 0),
          added: acc.added + (changeStatus === 'added' ? 1 : 0),
          removed: acc.removed + (changeStatus === 'removed' ? 1 : 0),
          modified: acc.modified + (changeStatus === 'modified' ? 1 : 0),
          impacted: acc.impacted + (impacted ? 1 : 0),
          implicit: acc.implicit + (changeStatus === 'implicit' ? 1 : 0),
        };
      },
      {
        total: 0,
        added: 0,
        removed: 0,
        modified: 0,
        impacted: 0,
        implicit: 0,
      },
    );

  return (
    <Grid templateColumns="repeat(4, 1fr)" gap={6}>
      <SummaryText name="Total" value={total} />
      <SummaryText
        name="Impacted"
        value={impacted}
        tip="Explicit changes and their downstream"
      />
      <SummaryText
        name="Explicit Changes"
        value={
          <>
            {added + removed + modified}{' '}
            <ChangeStatusWidget
              added={added}
              removed={removed}
              modified={modified}
            />{' '}
          </>
        }
        tip="Code change or config change"
      />
      <SummaryText
        name="Implicit Changes"
        value={implicit}
        tip="Any detected changes which are not explicit changed"
      />
    </Grid>
  );
}
