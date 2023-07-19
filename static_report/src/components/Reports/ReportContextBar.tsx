import { Flex, FlexProps, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { BiPlug } from 'react-icons/bi';
import { BsGearWideConnected } from 'react-icons/bs';
import { GoGitBranch } from 'react-icons/go';
import { borderVal } from '../../utils';

interface Props {
  datasource?: string;
  version?: string;
  gitBranch?: string;
  showProjectInfo?: boolean;
  children?: ReactNode;
  actionArea?: ReactNode;
}
/**
 * A UI Bar that provides information about the active report or a project's summary and run-selector, when available. Defaults to only show one active report.
 */
export function ReportContextBar({
  datasource,
  version,
  gitBranch,
  showProjectInfo,
  children,
  actionArea,
  ...props
}: Props & FlexProps) {
  return (
    <Flex
      w={'100%'}
      gap={5}
      justify={'space-between'}
      alignItems={'center'}
      bg={'gray.100'}
      border={borderVal}
      borderX={0}
      px="80px"
      py="10px"
      {...props}
    >
      <Flex gap={5}>
        {children}
        {showProjectInfo && (
          <Flex gap={5}>
            <Flex alignItems={'center'} gap={2}>
              <BiPlug />
              <Text color={'gray.500'}>Source: {datasource}</Text>
            </Flex>
            <Flex alignItems={'center'} gap={2}>
              <BsGearWideConnected />
              <Text color={'gray.500'}>Version: {version}</Text>
            </Flex>
          </Flex>
        )}
        {gitBranch && (
          <Flex alignItems={'center'} gap={2}>
            <GoGitBranch />
            <Text color={'gray.500'}>Branch: {gitBranch}</Text>
          </Flex>
        )}
      </Flex>
      {actionArea}
    </Flex>
  );
}
