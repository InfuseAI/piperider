import { Text, Tooltip } from '@chakra-ui/react';
import React from 'react';

type Props = { label?: string; prefix: string } & {
  children: React.ReactNode;
  [k: string]: any;
};
export function SRTooltip({ label = '', prefix, children, ...props }: Props) {
  const match = label.match(`${prefix}(?<src>\\w+)$`);
  const richLabel = match?.groups?.src ? (
    <Text>
      {label.slice(0, match.index)}
      <Text as="i" color="gray.400">
        {`${prefix}${match.groups.src}`}
      </Text>
    </Text>
  ) : (
    label
  );

  return (
    <Tooltip label={richLabel} {...props} closeOnEsc={true}>
      {children}
    </Tooltip>
  );
}
