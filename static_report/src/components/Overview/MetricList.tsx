import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Icon,
  Tooltip,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { FaSortAlphaDown, FaSortNumericDown } from 'react-icons/fa';
import { Link } from 'wouter';
import { Comparable, NODE_IMPACT_STATUS_MSGS } from '../../lib';
import { CompDbtNodeEntryItem } from '../../utils/store';
import { getIconForChangeStatus } from '../Icons';
import { ChangeStatusWidget } from '../Widgets/ChangeStatusWidget';

type Props = {
  tableColumnsOnly: CompDbtNodeEntryItem[];
  sortMethod: string;
  handleSortChange: () => void;
} & Comparable;

export function MetricList({
  tableColumnsOnly,
  sortMethod,
  handleSortChange,
  singleOnly,
}: Props) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            {!singleOnly && <Th p={0} width="30px"></Th>}
            <Th pl={0}>
              Name{' '}
              <Tooltip label={`sort by ${sortMethod} order`}>
                <IconButton
                  aria-label="Sort"
                  icon={
                    sortMethod === 'alphabet' ? (
                      <FaSortAlphaDown />
                    ) : (
                      <FaSortNumericDown />
                    )
                  }
                  onClick={handleSortChange}
                  size="sm"
                  ml="1"
                />
              </Tooltip>
            </Th>
            {!singleOnly && (
              <Th p={0} width="30px">
                Impact
              </Th>
            )}
            <Th>Queries</Th>
          </Tr>
        </Thead>
        <Tbody fontSize="sm">
          {tableColumnsOnly.map((tableColsEntry, i) => {
            const [, { base, target }, metadata] = tableColsEntry;
            const fallback = base ?? target;
            if (!fallback) {
              return <></>;
            }

            const { icon, color } = getIconForChangeStatus(
              metadata.changeStatus,
              metadata.impactStatus,
            );

            let impact = '-';
            if (metadata.impactStatus) {
              impact = NODE_IMPACT_STATUS_MSGS[metadata.impactStatus][0];
            }

            return (
              <Tr>
                {!singleOnly && (
                  <Td p={0}>
                    <Flex alignContent="center">
                      {icon && <Icon color={color} as={icon} />}
                    </Flex>
                  </Td>
                )}
                <Td pl={0}>
                  <Link href={`/metrics/${fallback.unique_id}`}>
                    {fallback.name}
                  </Link>
                </Td>
                {!singleOnly && <Td pl={0}>{impact}</Td>}
                <Td>
                  {`${Object.keys(fallback?.__queries || {}).length}`}
                  <ChangeStatusWidget
                    added={metadata.added}
                    removed={metadata.deleted}
                    modified={metadata.changed}
                  />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
