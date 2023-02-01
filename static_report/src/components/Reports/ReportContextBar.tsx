import { Flex, Text } from '@chakra-ui/react';
import { BiPlug } from 'react-icons/bi';
import { BsGearWideConnected } from 'react-icons/bs';
import { FiGrid } from 'react-icons/fi';
import { SaferSRSchema } from '../../types';
import { CompTableColEntryItem } from '../../utils';

type Props = {
  tableColumns: CompTableColEntryItem[];
  datasource?: SaferSRSchema['datasource'];
  version?: SaferSRSchema['version'];
  showProjectInfo?: boolean;
};
/**
 * A UI Bar that provides information about the active report or a project's summary and run-selector, when available. Defaults to only show one active report.
 */
export function ReportContextBar({
  tableColumns,
  datasource,
  version,
  showProjectInfo,
}: Props) {
  const tableCount = tableColumns.length;

  //TODO: showProjectInfo=true will present a selector followed by a info about the reports list for the project
  return showProjectInfo ? (
    <Flex>
      PLACEHOLDER: SHOW_PROJ_INFO UI case (selector + reports-list-meta)
    </Flex>
  ) : (
    <Flex p={5} w={'100%'} gap={5} boxShadow={'xs'}>
      <Flex alignItems={'center'} gap={2}>
        <BiPlug />
        <Text color={'gray.500'}>Source: {datasource?.name}</Text>
      </Flex>
      <Flex alignItems={'center'} gap={2}>
        <FiGrid />
        <Text color={'gray.500'}>Tables: {tableCount}</Text>
      </Flex>
      <Flex alignItems={'center'} gap={2}>
        <BsGearWideConnected />
        <Text color={'gray.500'}>Version: {version}</Text>
      </Flex>
    </Flex>
  );
}
