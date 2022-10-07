import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react';
import { formatTestExpectedOrActual } from '../../../../utils/formatters';
import { AssertionStatus } from '../../Assertions/AssertionStatus';
import { NO_VALUE } from '../../Columns/constants';
import { NoData } from '../../Layouts';
import { CRModalData } from './CRModal';

type Props = { data?: CRModalData };
export function AssertionTestDetail({ data }: Props) {
  if (!data) return <NoData />;

  const isDbtKind = data.assertionKind === 'dbt';
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th />
            <Th>Status</Th>
            {isDbtKind ? (
              <Th>Message</Th>
            ) : (
              <>
                <Th>Expected</Th>
                <Th>Actual</Th>
              </>
            )}
          </Tr>
        </Thead>

        <Tbody>
          <Tr>
            <Td fontWeight={700}>Base</Td>
            <Td>
              <AssertionStatus status={data?.base?.status} />
            </Td>
            {isDbtKind ? (
              <Td>{data?.base?.message ?? NO_VALUE}</Td>
            ) : (
              <>
                <Td>{formatTestExpectedOrActual(data?.base?.expected)}</Td>
                <Td>{formatTestExpectedOrActual(data?.base?.actual)}</Td>
              </>
            )}
          </Tr>

          <Tr>
            <Td fontWeight={700}>Target</Td>
            <Td>
              <AssertionStatus status={data?.target?.status} />
            </Td>
            {isDbtKind ? (
              <Td>{data?.target?.message ?? NO_VALUE}</Td>
            ) : (
              <>
                <Td>{formatTestExpectedOrActual(data?.target?.expected)}</Td>
                <Td>{formatTestExpectedOrActual(data?.target?.actual)}</Td>
              </>
            )}
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}
