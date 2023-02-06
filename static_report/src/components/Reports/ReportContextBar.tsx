import { Flex, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { BiPlug } from 'react-icons/bi';
import { BsGearWideConnected } from 'react-icons/bs';

import { SaferSRSchema } from '../../types';

interface Props {
  datasource?: SaferSRSchema['datasource'];
  version?: SaferSRSchema['version'];
  showProjectInfo?: boolean;
  children?: ReactNode;
}
/**
 * A UI Bar that provides information about the active report or a project's summary and run-selector, when available. Defaults to only show one active report.
 */
export function ReportContextBar({
  datasource,
  version,
  showProjectInfo,
  children,
}: Props) {
  return (
    <Flex p={5} w={'100%'} gap={5} boxShadow={'xs'}>
      {showProjectInfo ? (
        children
      ) : (
        <>
          <Flex alignItems={'center'} gap={2}>
            <BiPlug />
            <Text color={'gray.500'}>Source: {datasource?.name}</Text>
          </Flex>
          <Flex alignItems={'center'} gap={2}>
            <BsGearWideConnected />
            <Text color={'gray.500'}>Version: {version}</Text>
          </Flex>
        </>
      )}
    </Flex>
  );
}
