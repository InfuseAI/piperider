import { Text, Collapse, Flex, Icon, CollapseProps } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiChevronUp } from 'react-icons/fi';

interface Props extends CollapseProps {
  children: ReactNode;
  onVisible: () => void;
}

export function CollapseContent({
  children,
  startingHeight = 250,
  onVisible,
  ...props
}: Props) {
  return (
    <>
      <Collapse startingHeight={startingHeight} in={props.in}>
        {children}
      </Collapse>
      <Flex
        as="button"
        justifyContent="center"
        alignItems="center"
        color="piperider.500"
        mt={4}
        height={8}
        onClick={() => {
          onVisible();
        }}
      >
        <Text as="span">{props.in ? 'Less' : 'More'}</Text>
        <Icon
          as={FiChevronUp}
          boxSize={6}
          transform={props.in ? 'rotate(0deg)' : 'rotate(180deg)'}
          transition="transform 0.2s ease-in"
        />
      </Flex>
    </>
  );
}
