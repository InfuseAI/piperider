import { VStack, Box, Icon, Text, Tooltip, Grid, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiInfo } from 'react-icons/fi';
import {
  ChangeStatus,
  CompDbtNodeEntryItem,
  NODE_CHANGE_STATUS_MSGS,
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
      <Text fontSize="sm">{value}</Text>
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
  const [label] = NODE_CHANGE_STATUS_MSGS[changeStatus ?? ''];
  const { icon, color } = getIconForChangeStatus(changeStatus);

  return (
    <VStack alignItems="stretch">
      <Flex alignItems="center" fontSize="sm" color="gray">
        <Icon mr="5px" as={icon} color={color} />
        {label}
      </Flex>
      <Text fontSize="sm">{value}</Text>
    </VStack>
  );
}

type Props = {
  tableColumnsOnly: CompDbtNodeEntryItem[];
};

export function ChangeSummary({ tableColumnsOnly }: Props) {
  const {
    adds,
    removes,
    modifies,
    potentiallyImpacted,
    assessed,
    skipped,
    impacted,
  } = tableColumnsOnly.reduce(
    (acc, [key, { base, target }, { changeStatus, impactStatus }]) => {
      return {
        total: acc.total + (target ? 1 : 0),
        adds: acc.adds + (changeStatus === 'added' ? 1 : 0),
        removes: acc.removes + (changeStatus === 'removed' ? 1 : 0),
        modifies: acc.modifies + (changeStatus === 'modified' ? 1 : 0),
        potentiallyImpacted: acc.potentiallyImpacted + (impactStatus ? 1 : 0),
        assessed:
          acc.assessed +
          (impactStatus === 'impacted' ||
          impactStatus === 'assessed_not_impacted'
            ? 1
            : 0),
        skipped: acc.skipped + (impactStatus === 'skipped' ? 1 : 0),
        impacted: acc.impacted + (impactStatus === 'impacted' ? 1 : 0),
      };
    },
    {
      total: 0,
      adds: 0,
      removes: 0,
      modifies: 0,
      potentiallyImpacted: 0,
      assessed: 0,
      skipped: 0,
      impacted: 0,
    },
  );

  return (
    <Grid templateColumns="1fr 1fr" mb="10px" borderTop="1px solid lightgray">
      <Box borderColor="lightgray">
        <SummaryText
          name="Code Changed"
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
          name="Resource Impact Summary"
          value={
            <>
              <Grid templateColumns="1fr 1fr 1fr" width="100%">
                <SummaryText
                  name="Potentially Impacted"
                  value={potentiallyImpacted}
                />
                <SummaryText
                  name="Assessed"
                  value={
                    <>
                      {assessed} assessed, {skipped} skipped
                    </>
                  }
                />
                <SummaryText name="Impacted" value={impacted} />
              </Grid>
            </>
          }
        />
      </Box>
    </Grid>
  );
}
