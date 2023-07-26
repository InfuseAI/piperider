import { VStack, Box, Icon, Text, Tooltip, Grid, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiInfo } from 'react-icons/fi';
import { CompTableColEntryItem } from '../../lib';
import { IconAdded } from '../Icons';
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
    <VStack alignItems="stretch">
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
};

export function ChangeSummary({ tableColumnsOnly }: Props) {
  const { total, added, removed, modified, impacted, implicit } =
    tableColumnsOnly.reduce(
      (acc, [key, { base, target }, { changeStatus, impacted }]) => {
        return {
          total: acc.total + (target ? 1 : 0),
          added: acc.added + (changeStatus === 'added' ? 1 : 0),
          removed: acc.removed + (changeStatus === 'removed' ? 1 : 0),
          modified: acc.modified + (changeStatus === 'modified' ? 1 : 0),
          impacted: acc.impacted + (impacted ? 1 : 0),
          implicit: acc.implicit + 1,
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
    <Grid templateColumns="1fr 1fr">
      {/* <SummaryText
        name="Code Changes"
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
      /> */}
      <Box borderColor="lightgray">
        <SummaryText
          name="Code Change"
          value={
            <>
              <Grid templateColumns="1fr 1fr 1fr" width="100%">
                <SummaryText
                  name="Added"
                  value={
                    <Flex alignItems="center" justifyContent="flex-start">
                      3 <Icon as={IconAdded} />
                    </Flex>
                  }
                />
                <SummaryText name="Removed" value={3} />
                <SummaryText name="Modified" value={3} />
              </Grid>
            </>
          }
          tip="Explicit changes and their downstream"
        />
      </Box>

      <Box borderLeft="1px" paddingLeft="20px" borderColor="lightgray">
        <SummaryText
          name="Code Change Downstreams"
          value={
            <>
              <Grid templateColumns="1fr 1fr 1fr" width="100%">
                <SummaryText name="Impacts" value={3} />
                <SummaryText name="Potentials" value={3} />
                <SummaryText name="No Changes" value={3} />
              </Grid>
            </>
          }
          tip="Explicit changes and their downstream"
        />
      </Box>
    </Grid>
  );
}
