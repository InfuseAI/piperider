import { Flex, Text, Grid, useDisclosure } from '@chakra-ui/react';
import { useState } from 'react';

import { TableListItem } from '../components/Tables/TableList/TableListItem';
import { tableListGridTempCols, tableListMaxWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';
import { TableColumnSchemaList } from '../components/Tables/TableList/TableColumnSchemaList';
import { useTrackOnMount } from '../hooks/useTrackOnMount';
import { EVENTS, SR_TYPE_LABEL } from '../utils/trackEvents';
import { CommonModal } from '../components/Common/CommonModal';

export function SRTablesListPage() {
  const modal = useDisclosure();
  const [tableColsEntryId, setTableColsEntryId] = useState(-1);
  const { tableColumnsOnly = [], assertionsOnly } = useReportStore.getState();

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'table-list-page',
    },
  });

  return (
    <>
      <Text fontSize={'xl'} fontWeight={'semibold'} textAlign={'left'}>
        Tables
      </Text>

      <Flex direction="column" width={'100%'} minHeight="650px">
        <Grid
          templateColumns={tableListGridTempCols}
          maxW={tableListMaxWidth}
          px={4}
          my={6}
        >
          <Text>Name</Text>
          <Text>Summary</Text>
          <Text>Assertions</Text>
        </Grid>
        {tableColumnsOnly.map((tableColsEntry, i) => {
          return (
            <TableListItem
              key={i}
              combinedAssertions={assertionsOnly}
              combinedTableEntry={tableColsEntry}
              singleOnly
              onInfoClick={() => {
                setTableColsEntryId(i);
                modal.onOpen();
              }}
            />
          );
        })}
      </Flex>

      <CommonModal
        {...modal}
        size="2xl"
        title={tableColsEntryId !== -1 && tableColumnsOnly[tableColsEntryId][0]}
        onClose={() => {
          setTableColsEntryId(-1);
          modal.onClose();
        }}
      >
        <Text fontSize="lg" mb={4}>
          Description:{' '}
          {(tableColsEntryId !== -1 &&
            tableColumnsOnly[tableColsEntryId][1].base?.description) ?? (
            <Text as="i">No description provided.</Text>
          )}
        </Text>
        {tableColsEntryId !== -1 && (
          <TableColumnSchemaList
            singleOnly
            columns={tableColumnsOnly[tableColsEntryId][1].base?.__columns}
          />
        )}
      </CommonModal>
    </>
  );
}
