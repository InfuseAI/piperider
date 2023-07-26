import { Text, Flex, Icon, Box } from '@chakra-ui/react';
import { ChangeStatus } from '../../lib';
import { getIconForChangeStatus } from '../Icons';

type Props = {
  added?: number;
  removed?: number;
  modified?: number;
};

function ChangeStatusOne({
  value,
  changeStatus,
}: {
  value?: number;
  changeStatus: ChangeStatus;
}) {
  const { icon, color } = getIconForChangeStatus(changeStatus);

  return (
    <>
      <Icon as={icon} color={color} /> <Text ml={1}>{value}</Text>
    </>
  );
}

export function ChangeStatusWidget({ added, removed, modified }: Props) {
  const items: any[] = [];
  let first = true;

  if (added) {
    items.push(first ? <>(</> : <Box pr={2}>,</Box>);
    items.push(<ChangeStatusOne value={added} changeStatus="added" />);
    first = false;
  }
  if (removed) {
    items.push(first ? <>(</> : <Box pr={2}>,</Box>);
    items.push(<ChangeStatusOne value={removed} changeStatus="removed" />);
    first = false;
  }
  if (modified) {
    items.push(first ? <>(</> : <Box pr={2}>,</Box>);
    items.push(<ChangeStatusOne value={modified} changeStatus="modified" />);
    first = false;
  }
  if (!first) {
    items.push(<>{')'}</>);
  }

  return (
    <Box display="inline-block">
      <Flex alignItems="center" justifyContent="center">
        {items}
      </Flex>
    </Box>
  );
}
