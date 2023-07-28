import { VStack, Box, Icon, Text, Tooltip, Grid, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiInfo } from 'react-icons/fi';
import {
  ChangeStatus,
  CompTableColEntryItem,
  NODE_CHANGE_STATUS_COUNT_MSGS,
} from '../../lib';
import { getIconForChangeStatus } from '../Icons';

function SummaryText({
  name,
  value,
  tip,
}: {
  name: ReactNode;
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

function ChangeStatusCountLabel({
  changeStatus,
  value,
}: {
  changeStatus: ChangeStatus;
  value: number;
}) {
  const [label, description] =
    NODE_CHANGE_STATUS_COUNT_MSGS[changeStatus ?? ''];
  const { icon, color } = getIconForChangeStatus(changeStatus);

  return (
    <VStack alignItems="stretch">
      <Flex alignItems="center" fontSize="sm" color="gray">
        <Icon mr="5px" as={icon} color={color} />
        {label}
        <Tooltip label={description}>
          <Box display="inline-block">
            <Icon mx={'2px'} as={FiInfo} boxSize={3} />
          </Box>
        </Tooltip>
      </Flex>
      <Text fontSize="l">{value}</Text>
    </VStack>
  );
}

type Props = {
  tableColumnsOnly: CompTableColEntryItem[];
};

export function ChangeSummary({ tableColumnsOnly }: Props) {
  const {
    adds,
    removes,
    modifies,
    downstreamImpacts,
    downstreamPotentials,
    downstreamNoChanges,
  } = tableColumnsOnly.reduce(
    (acc, [key, { base, target }, { changeStatus }]) => {
      return {
        total: acc.total + (target ? 1 : 0),
        adds: acc.adds + (changeStatus === 'added' ? 1 : 0),
        removes: acc.removes + (changeStatus === 'removed' ? 1 : 0),
        modifies: acc.modifies + (changeStatus === 'modified' ? 1 : 0),
        downstreamImpacts:
          acc.downstreamImpacts + (changeStatus === 'ds_impacted' ? 1 : 0),
        downstreamPotentials:
          acc.downstreamPotentials + (changeStatus === 'ds_potential' ? 1 : 0),
        downstreamNoChanges:
          acc.downstreamNoChanges + (changeStatus === 'ds_not_changed' ? 1 : 0),
      };
    },
    {
      total: 0,
      adds: 0,
      removes: 0,
      modifies: 0,
      downstreamImpacts: 0,
      downstreamPotentials: 0,
      downstreamNoChanges: 0,
    },
  );

  return (
    <Grid templateColumns="1fr 1fr" mb="10px">
      <Box borderColor="lightgray">
        <SummaryText
          name="Code Changes"
          tip="Changes caused by users through editing. This may include adding or removing, renaming, or adjusting configuration."
          value={
            <>
              <Grid templateColumns="1fr 1fr 1fr" width="100%">
                <ChangeStatusCountLabel changeStatus="added" value={adds} />
                <ChangeStatusCountLabel
                  changeStatus="removed"
                  value={removes}
                />
                <ChangeStatusCountLabel
                  changeStatus="modified"
                  value={modifies}
                />
              </Grid>
            </>
          }
        />
      </Box>

      <Box borderLeft="1px" paddingLeft="12px" borderColor="lightgray">
        <SummaryText
          name="Downstreams of code changes"
          tip="This is the affected scope of the code changes."
          value={
            <>
              <Grid templateColumns="1fr 1fr 1fr" width="100%">
                <ChangeStatusCountLabel
                  changeStatus="ds_impacted"
                  value={downstreamImpacts}
                />
                <ChangeStatusCountLabel
                  changeStatus="ds_potential"
                  value={downstreamPotentials}
                />
                <ChangeStatusCountLabel
                  changeStatus="ds_not_changed"
                  value={downstreamNoChanges}
                />
              </Grid>
            </>
          }
        />
      </Box>
    </Grid>
  );
}
