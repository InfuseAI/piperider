import { Text, Tooltip } from '@chakra-ui/react';

type Props = { label: string; via: string };
function DescriptionLabel({ label, via }: Props) {
  return (
    <Text>
      {label}
      <Text as="i" color="gray.400">
        {` - via ${via}`}
      </Text>
    </Text>
  );
}

export function DescriptionTooltip({ description, children, ...props }) {
  const match = description.match(/ - via (?<via>\w+)$/);

  if (match && match.groups) {
    const label = description.slice(0, match.index);
    const via = match.groups.via;
    return (
      <Tooltip label={<DescriptionLabel label={label} via={via} />} {...props}>
        {children}
      </Tooltip>
    );
  } else {
    return (
      <Tooltip label={description} {...props}>
        {children}
      </Tooltip>
    );
  }
}
