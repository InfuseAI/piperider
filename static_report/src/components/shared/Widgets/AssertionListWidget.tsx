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
  TableProps,
  TableContainerProps,
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
  formatTestExpectedOrActual,
  ReportState,
} from '../../../utils';
import { AssertionStatus } from '../Assertions';
import { CRModal, CRModalData } from '../Modals/CRModal/CRModal';

interface Props extends Comparable {
  comparableAssertions: ReportState['tableColumnAssertionsOnly'];
  filterString?: string;
  setFilterString?: (input: string) => void;
  tableSize?: TableProps['size'];
}
/*
  A widget for displaying a UI table of comparable assertions (single vs both)
  Allows sorting by selecting column headers (default, asc, desc)
  Accepts a filterString for filtering the shown list
*/
export function AssertionListWidget({
  comparableAssertions,
  filterString = '',
  singleOnly,
  tableSize,
  ...props
}: Props & TableContainerProps) {
  const modal = useDisclosure();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [testDetail, setTestDetail] = useState<CRModalData | undefined>();
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
      header: 'Test Subject',
    },
    columnHelper.accessor('name', {
      cell: (info) => info.getValue(),
      header: 'Assertion',
    }),
    columnHelper.accessor('expected', {
      //dbt: empty
      cell: (info) => info.getValue(),
      header: 'Expected Value',
      enableGlobalFilter: false,
    }),
    columnHelper.accessor('actual', {
      //dbt: message
      cell: (info) =>
        info.row.original.kind === 'dbt'
          ? info.row.original.message
          : info.getValue(),
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
      <TableContainer {...props}>
        <Table variant="simple" size={tableSize}>
          <Thead>
            <Tr>
              {table.getFlatHeaders().map((headerRow) => {
                const hasSameTableCols =
                  headerRow.id === 'testSubject' ||
                  headerRow.id === 'name' ||
                  headerRow.id === 'kind';
                const sortToggle = (
                  <chakra.span pl="4" pos={'absolute'} right={0}>
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
                    pos={'relative'}
                    key={headerRow.id}
                    onClick={headerRow.column.getToggleSortingHandler()}
                    _hover={{ cursor: 'pointer' }}
                    textAlign={headerRow.id === 'status' ? 'center' : 'left'}
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
                        pos={'relative'}
                        onClick={headerRow.column.getToggleSortingHandler()}
                        _hover={{ cursor: 'pointer' }}
                      >
                        Base Status
                        {sortToggle}
                      </Th>
                      <Th
                        pos={'relative'}
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
                const {
                  tableName,
                  columnName,
                  name,
                  expected,
                  actual,
                  kind,
                  status,
                  message,
                } = row.original;
                const targetRef =
                  targetFlatAssertions?.[index]?.name === tableName
                    ? targetFlatAssertions?.[index]
                    : undefined;
                return (
                  <Tr key={row.id}>
                    <Td display={'flex'} justifyContent={'center'}>
                      <AssertionStatus status={status} />
                    </Td>
                    {!singleOnly && (
                      <Td>
                        <AssertionStatus status={targetRef?.status} />
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
                            {formatTestExpectedOrActual(expected)}
                          </Code>
                        </Td>
                        <Td>
                          <Code
                            color={status === 'failed' ? 'red.500' : 'gray.700'}
                          >
                            {formatTestExpectedOrActual(
                              kind === 'piperider' ? actual : message,
                            )}
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
                            target: targetRef,
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
