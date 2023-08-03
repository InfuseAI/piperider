import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Image,
  Text,
  Heading,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  OrderedList,
  ListItem,
  Code,
  Link,
} from '@chakra-ui/react';
import { CloudPlusIcon, Comparable } from '../../lib';

function UploadReportPopoverBody() {
  return (
    <>
      <Heading fontSize="md" as="h1">
        The benefits of Uploading Report
      </Heading>
      <Text fontSize="sm">
        View the Lineage Diff of your dbt code changes on PipeRider Cloud.
      </Text>
      <br />
      <Heading fontSize="md" as="h1">
        What's Lineage Diff?
      </Heading>
      <Text fontSize="sm">
        Visualize and compare the impact of your dbt code changes.
      </Text>
      <Image src="https://miro.medium.com/v2/resize:fit:3106/format:webp/1*YMiRnwJ7x2xaApEva5C_7Q.png" />
      <br />
      <Heading fontSize="md" as="h1">
        How to upload report?
      </Heading>
      <Text fontSize="sm">Please follow the steps below to upload report.</Text>
      <OrderedList fontSize="sm">
        <ListItem>
          Sign up PipeRider Cloud: <Code>piperider cloud signup</Code>
        </ListItem>
        <ListItem>
          Upload the latest piperider report:{' '}
          <Code>piperider cloud upload-report</Code>
        </ListItem>
        <ListItem>
          Login your PipeRider Cloud to view report:{' '}
          <Link href="https://cloud.piperider.io" isExternal>
            https://cloud.piperider.io <ExternalLinkIcon mx="2px" />
          </Link>
        </ListItem>
      </OrderedList>
    </>
  );
}

function LineageDiffPopoverBody() {
  return (
    <>
      <Heading fontSize="md" as="h1">
        What's Lineage Diff?
      </Heading>
      <Text fontSize="sm">
        Visualize and compare the impact of your dbt code changes.
      </Text>
      <Image src="https://miro.medium.com/v2/resize:fit:3106/format:webp/1*YMiRnwJ7x2xaApEva5C_7Q.png" />
      <br />
      <Heading fontSize="md" as="h1">
        How to access Lineage Diff?
      </Heading>
      <Text fontSize="sm">
        The Lineage Diff feature is available on PipeRider Cloud.
      </Text>
      <Text fontSize="sm">
        Please follow the steps below to view the Lineage Diff.
      </Text>
      <OrderedList fontSize="sm">
        <ListItem>
          Sign up PipeRider Cloud: <Code>piperider cloud signup</Code>
        </ListItem>
        <ListItem>
          Upload the latest piperider comparison report:{' '}
          <Code>piperider compare-reports --upload --last</Code>
        </ListItem>
        <ListItem>
          Login your PipeRider Cloud to view report:{' '}
          <Link href="https://cloud.piperider.io" isExternal>
            https://cloud.piperider.io <ExternalLinkIcon mx="2px" />
          </Link>
        </ListItem>
      </OrderedList>
    </>
  );
}

export function LineageDiffPopover({ singleOnly }: Comparable) {
  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <IconButton
          isRound={true}
          aria-label="hint of PipeRider Cloud"
          variant="ghost"
          size="sm"
          icon={<CloudPlusIcon />}
        />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverArrow />
        <PopoverHeader fontWeight="semibold" fontSize="md">
          {singleOnly
            ? 'Upload report to PipeRider Cloud'
            : 'Try Lineage Diff on PipeRider Cloud'}
        </PopoverHeader>
        <PopoverBody>
          {singleOnly ? (
            <UploadReportPopoverBody />
          ) : (
            <LineageDiffPopoverBody />
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
