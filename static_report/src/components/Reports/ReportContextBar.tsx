import { Box, Flex, FlexProps, Link, Text, Tooltip } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { BiPlug } from 'react-icons/bi';
import { BsGearWideConnected } from 'react-icons/bs';
import { GoGitBranch } from 'react-icons/go';
import { TbBuildingWarehouse } from 'react-icons/tb';
import { VscGitPullRequest } from 'react-icons/vsc';

import {
  Comparable,
  ComparisonReportSchema,
  SingleReportSchema,
} from '../../types';
import { borderVal } from '../../utils';

interface Props extends Comparable, FlexProps {
  data?: Partial<ComparisonReportSchema> | Partial<SingleReportSchema>;
  children?: ReactNode;
  actionArea?: ReactNode;
}
/**
 * A UI Bar that provides information about the active report or a project's summary and run-selector, when available. Defaults to only show one active report.
 */
export function ReportContextBar({
  data,
  children,
  actionArea,
  singleOnly,
  ...props
}: Props) {
  let datasource: string | undefined = undefined;
  let version: string | undefined = undefined;
  let gitBranch: string | null | undefined = undefined;
  let githubPr: string | undefined = undefined;
  let githubPrUrl: string | undefined = undefined;
  let baseFrom: string | undefined = undefined;
  let targetFrom: string | undefined = undefined;
  let skipDataSource: boolean | undefined = false;

  if (data) {
    if (singleOnly) {
      const report = data as SingleReportSchema;
      datasource = report.datasource?.name;
      version = report.version;
      gitBranch = report.datasource?.git_branch;
      skipDataSource = report.datasource?.skip_datasource;
      baseFrom = report.datasource?.skip_datasource
        ? 'Manifest File'
        : `${report.datasource.type} Connection`;
    } else {
      const report = data as ComparisonReportSchema;
      const fallback = report.input ?? report.base;
      datasource = fallback.datasource?.name;
      version = fallback.version;

      if (
        report.base?.datasource.git_branch &&
        report.input?.datasource.git_branch
      ) {
        gitBranch = `${report.base?.datasource.git_branch} ↔ ${report.input?.datasource.git_branch}`;
      } else if (report.input?.datasource.git_branch) {
        gitBranch = report.input?.datasource.git_branch;
      }

      if (report.metadata?.github_pr_id && report.metadata?.github_pr_url) {
        if (report.metadata?.github_pr_title) {
          githubPr = `#${report.metadata?.github_pr_id} ${report.metadata?.github_pr_title}`;
        } else {
          githubPr = `#${report.metadata?.github_pr_id}`;
        }

        githubPrUrl = report.metadata?.github_pr_url;
      }

      skipDataSource =
        report.base?.datasource.skip_datasource ||
        report.input?.datasource.skip_datasource;

      baseFrom = report.base?.datasource.skip_datasource
        ? 'Manifest File'
        : `${report.base?.datasource.type} Connection`;
      targetFrom = report.input?.datasource.skip_datasource
        ? 'Manifest File'
        : `${report.input?.datasource.type} Connection`;
    }
  }

  const showIcon = (skipDataSource: boolean | undefined) => {
    return skipDataSource ? (
      <Tooltip
        shouldWrapChildren
        label="Connect PipeRider to your datasource for full schema info"
        placement="top-start"
      >
        <TbBuildingWarehouse />
      </Tooltip>
    ) : (
      <TbBuildingWarehouse />
    );
  };

  const showReportSource = (
    singleOnly: boolean | undefined,
    baseFrom: string | undefined,
    targetFrom: string | undefined,
    skipDataSource: boolean | undefined,
  ) => {
    let source: string | undefined = undefined;
    if (singleOnly) {
      source = baseFrom;
    } else {
      source = targetFrom ?? baseFrom;
    }
    return (
      <Flex alignItems={'center'} gap={2} flex="1" overflow="hidden">
        {showIcon(skipDataSource)}
        <Text
          flex="1"
          color={'gray.500'}
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          overflow="hidden"
        >
          {source}
        </Text>
      </Flex>
    );
  };

  return (
    <Flex
      gap={5}
      justify={'space-between'}
      alignItems={'center'}
      bg={'gray.100'}
      border={borderVal}
      borderX={0}
      px="96px"
      py="10px"
      {...props}
    >
      {children && <Box flex="0 0 auto">{children}</Box>}
      <Flex overflow="hidden" gap={5} justify={'flex-start'} flex="1">
        {datasource && (
          <Flex gap={5}>
            <Flex alignItems={'center'} gap={2} overflow="hidden">
              <BiPlug />
              <Text
                flex="1"
                color={'gray.500'}
                whiteSpace="nowrap"
                textOverflow="ellipsis"
                overflow="hidden"
              >
                {datasource}
              </Text>
            </Flex>
          </Flex>
        )}
        {version && (
          <Flex alignItems={'center'} gap={2} overflow="hidden">
            <BsGearWideConnected />
            <Text
              flex="1"
              color={'gray.500'}
              whiteSpace="nowrap"
              textOverflow="ellipsis"
              overflow="hidden"
            >
              {version}
            </Text>
          </Flex>
        )}
        {githubPr && githubPrUrl && (
          <Flex alignItems={'center'} gap={2} overflow="hidden">
            <VscGitPullRequest />

            <Text
              flex="1"
              color={'gray.500'}
              whiteSpace="nowrap"
              textOverflow="ellipsis"
              overflow="hidden"
            >
              <Link href={githubPrUrl} target="_blank">
                {githubPr}
              </Link>
            </Text>
          </Flex>
        )}
        {gitBranch && (
          <Flex alignItems={'center'} gap={2} overflow="hidden">
            <GoGitBranch />
            <Text
              flex="1"
              color={'gray.500'}
              whiteSpace="nowrap"
              textOverflow="ellipsis"
              overflow="hidden"
            >
              {gitBranch}
            </Text>
          </Flex>
        )}
        {showReportSource(singleOnly, baseFrom, targetFrom, skipDataSource)}
      </Flex>
      {actionArea && <Box flex="0 0 auto">{actionArea}</Box>}
    </Flex>
  );
}
