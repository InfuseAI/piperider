import { Text, Tooltip } from '@chakra-ui/react';

type Props = { label: string; prefix: string; source: string };
function DescriptionLabel({ label, prefix, source }: Props) {
  return (
    <Text>
      {label}
      <Text as="i" color="gray.400">
        {`${prefix}${source}`}
      </Text>
    </Text>
  );
}

export function SRTooltip({ label, prefix, children, ...props }) {
  let richLabel = label;
  const match = label.match(`${prefix}(?<src>\\w+)$`);
  if (match?.groups?.src) {
    const desc = label.slice(0, match.index);
    const src = match.groups.src;
    richLabel = <DescriptionLabel label={desc} prefix={prefix} source={src} />;
  }

  return (
    <Tooltip label={richLabel} {...props}>
      {children}
    </Tooltip>
  );
}
