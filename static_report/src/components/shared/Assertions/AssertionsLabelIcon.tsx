import { Icon, IconProps } from '@chakra-ui/react';
import { FiArrowUpCircle, FiArrowDownCircle } from 'react-icons/fi';

export interface AssertionsLabelIconProps extends IconProps {
  delta: number;
}

export function AssertionsLabelIcon({
  delta,
  ...props
}: AssertionsLabelIconProps) {
  return (
    <Icon
      as={delta > 0 ? FiArrowUpCircle : FiArrowDownCircle}
      color="black"
      boxSize={5}
      {...props}
    />
  );
}
