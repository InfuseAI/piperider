import { Flex, FlexProps, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { BiPlug } from 'react-icons/bi';
import { BsGearWideConnected } from 'react-icons/bs';

interface Props {
  datasource?: string;
  version?: string;
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
  ...props
}: Props & FlexProps) {
  return (
    <Flex py={5} w={'100%'} gap={5} {...props}>
      <>
        {showProjectInfo && children}
        <Flex alignItems={'center'} gap={2}>
          <BiPlug />
          <Text color={'gray.500'}>Source: {datasource}</Text>
        </Flex>
        <Flex alignItems={'center'} gap={2}>
          <BsGearWideConnected />
          <Text color={'gray.500'}>Version: {version}</Text>
        </Flex>
      </>
    </Flex>
  );
}
