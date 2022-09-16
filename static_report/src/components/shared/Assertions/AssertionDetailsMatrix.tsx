import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react';
import { NO_VALUE } from '../Columns/constants';
import { AssertionStatus } from './AssertionStatus';
import { formatTestExpectedOrActual } from '../../../utils/formatters';
import { CRAssertionData } from '../../../types';

type Props = { data?: CRAssertionData; type?: string };
/**
 * A matrix showing tabular data of the assertion details across base and target
 */
export function AssertionDetailsMatrix({ data, type = 'piperider' }: Props) {
  const isDbtType = type === 'dbt';
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th></Th>
            <Th>Status</Th>
            {isDbtType ? (
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

            {isDbtType ? (
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
            {isDbtType ? (
              <Td>{data?.base?.message ?? NO_VALUE}</Td>
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
