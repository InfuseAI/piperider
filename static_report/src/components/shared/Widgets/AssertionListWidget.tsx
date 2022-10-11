import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import {
  Flex,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  useDisclosure,
  Code,
  chakra,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Fragment, useState } from 'react';
import { Comparable } from '../../../types';
import {
  EnrichedTableOrColumnAssertionTest,
  ReportState,
} from '../../../utils';
import { assertionListWidth } from '../../../utils/layout';
import { AssertionStatus } from '../Assertions';
import { CRModal, CRModalData } from '../Modals/CRModal/CRModal';

interface Props extends Comparable {
  comparableAssertions: ReportState['tableColumnAssertionsOnly'];
  filterString?: string;
  setFilterString?: (input: string) => void;
}
/*
	* Assertion List Item
	Status = Pass | Fail 
	Test Subject =“<TABLE>.<COLUMN>”
	Assertion = assertion.name
	Expected = assertion range expectation
	Actual = actual value
	Source (*)
*/
export function AssertionListWidget({
  comparableAssertions,
  filterString = '',
  singleOnly,
}: Props) {
  const modal = useDisclosure();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [testDetail, setTestDetail] = useState<CRModalData | undefined>(); // modal
  const columnHelper = createColumnHelper<EnrichedTableOrColumnAssertionTest>();

  const columns = [
    columnHelper.accessor('status', {
      cell: (info) => info.getValue(),
      header: 'Status',
      enableGlobalFilter: false,
    }),
    {
      accessorFn: (row) => `${row.tableName}.${row.columnName}`,
      id: 'testSubject',
    },
    columnHelper.accessor('name', {
      cell: (info) => info.getValue(),
      header: 'Assertion',
    }),
    columnHelper.accessor('expected', {
      cell: (info) => info.getValue(),
      header: 'Expected Value',
      enableGlobalFilter: false,
    }),
    columnHelper.accessor('actual', {
      cell: (info) => info.getValue(),
      header: 'Actual Value',
      enableGlobalFilter: false,
    }),
    columnHelper.accessor('kind', {
      cell: (info) => info.getValue(),
      header: 'Source',
      enableGlobalFilter: false,
    }),
  ];

  const { base: baseFlatAssertions, target: targetFlatAssertions } =
    comparableAssertions || {};

  //NOTE: Uses fallback reference for assertions (comparison will still reference target's assertions directly)
  const table = useReactTable({
    columns,
    data: (baseFlatAssertions || targetFlatAssertions || []).sort((v) => {
      return v.status === 'failed' ? -1 : 1;
    }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (table.getRowModel().rows.length === 0) {
    return (
      <Flex direction="column" justifyContent="center" alignItems="center">
        <Text textAlign="center">No tests available</Text>
      </Flex>
    );
  }

  return (
    <>
      <TableContainer w={assertionListWidth}>
        <Table variant="simple">
          <Thead>
            <Tr>
              {table.getFlatHeaders().map((headerRow) => {
                const hasSameTableCols =
                  headerRow.id === 'testSubject' ||
                  headerRow.id === 'name' ||
                  headerRow.id === 'kind';
                const sortToggle = (
                  <chakra.span pl="4">
                    {headerRow.column.getIsSorted() ? (
                      headerRow.column.getIsSorted() === 'desc' ? (
                        <TriangleDownIcon aria-label="sorted descending" />
                      ) : (
                        <TriangleUpIcon aria-label="sorted ascending" />
                      )
                    ) : null}
                  </chakra.span>
                );
                return singleOnly || hasSameTableCols ? (
                  <Th
                    key={headerRow.id}
                    onClick={headerRow.column.getToggleSortingHandler()}
                    _hover={{ cursor: 'pointer' }}
                  >
                    {flexRender(
                      headerRow.column.columnDef.header,
                      headerRow.getContext(),
                    )}
                    {sortToggle}
                  </Th>
                ) : (
                  headerRow.id === 'status' && (
                    <Fragment key={headerRow.id}>
                      <Th
                        onClick={headerRow.column.getToggleSortingHandler()}
                        _hover={{ cursor: 'pointer' }}
                      >
                        Base Status
                        {sortToggle}
                      </Th>
                      <Th
                        onClick={headerRow.column.getToggleSortingHandler()}
                        _hover={{ cursor: 'pointer' }}
                      >
                        Target Status
                        {sortToggle}
                      </Th>
                    </Fragment>
                  )
                );
              })}
              {!singleOnly && <Th>View</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {table
              .getRowModel()
              .rows.filter(({ original: v }) =>
                filterString
                  ? v.name.search(new RegExp(filterString, 'gi')) > -1 ||
                    (v.tableName || '').search(new RegExp(filterString, 'gi')) >
                      -1 ||
                    (v.columnName || '').search(
                      new RegExp(filterString, 'gi'),
                    ) > -1
                  : true,
              )
              .map((row, index) => {
                const targetTest = targetFlatAssertions?.[index];
                const {
                  tableName,
                  columnName,
                  name,
                  expected,
                  actual,
                  kind,
                  status,
                } = row.original;
                return (
                  <Tr key={row.id}>
                    <Td>
                      <AssertionStatus status={status} />
                    </Td>
                    {!singleOnly && (
                      <Td>
                        <AssertionStatus status={targetTest?.status} />
                      </Td>
                    )}
                    <Td>
                      {columnName
                        ? `${tableName}.${columnName}`
                        : `${tableName}`}
                    </Td>
                    <Td>{name}</Td>
                    {singleOnly && (
                      <>
                        <Td>
                          <Code color={'gray.700'}>
                            {JSON.stringify(expected)}
                          </Code>
                        </Td>
                        <Td>
                          <Code
                            color={
                              status === 'failed' ? 'red.500' : 'green.500'
                            }
                          >
                            {JSON.stringify(actual)}
                          </Code>
                        </Td>
                      </>
                    )}
                    <Td>{kind}</Td>
                    {!singleOnly && (
                      <Td
                        onClick={() => {
                          setTestDetail({
                            assertionKind: kind,
                            assertionName: name,
                            base: row.original,
                            target: targetTest,
                          });
                          modal.onOpen();
                        }}
                      >
                        <Text as="span" cursor="pointer">
                          🔍
                        </Text>
                      </Td>
                    )}
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </TableContainer>
      <CRModal
        {...modal}
        data={testDetail}
        onClose={() => {
          modal.onClose();
          setTestDetail(undefined);
        }}
      />
    </>
  );
}
