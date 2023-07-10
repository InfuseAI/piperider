import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  Icon,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { FaSortAlphaDown, FaSortNumericDown } from 'react-icons/fa';
import { Link } from 'wouter';
import { CompTableColEntryItem } from '../../utils/store';
import { getIconForChangeStatus } from '../Icons';
import { ChangeStatusWidget } from '../Widgets/ChangeStatusWidget';
import StatDiff from '../Widgets/StatDiff';

type Props = {
  tableColumnsOnly: CompTableColEntryItem[];
  sortMethod: string;
  handleSortChange: () => void;
};

export function MetricList({
  tableColumnsOnly,
  sortMethod,
  handleSortChange,
}: Props) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th p={0}></Th>
            <Th>
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
            <Th>Queries</Th>
          </Tr>
        </Thead>
        <Tbody>
          {tableColumnsOnly.map((tableColsEntry, i) => {
            const [key, { base, target }, metadata] = tableColsEntry;
            const fallback = base ?? target;
            if (!fallback) {
              return <></>;
            }

            const { icon, color } = getIconForChangeStatus(
              metadata.changeStatus,
            );

            return (
              <Tr>
                <Td p={0}>{icon && <Icon color={color} as={icon} />}</Td>
                <Td>
                  <Link href={`/metrics/${fallback.unique_id}`}>
                    {fallback.name}
                  </Link>
                </Td>
                <Td>
                  {`${Object.keys(fallback?.__queries || {}).length}`}
                  <Text as="span" fontSize="sm">
                    <ChangeStatusWidget
                      added={metadata.added}
                      removed={metadata.deleted}
                      modified={metadata.changed}
                    />
                  </Text>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
