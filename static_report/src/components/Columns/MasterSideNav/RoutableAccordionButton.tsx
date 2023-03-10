import { AccordionButton, Text } from '@chakra-ui/react';
import { useLocation } from 'wouter';

/**
 * TableItem: Accordion UI parent
 */
interface RoutableAccordionButtonProps {
  path: string;
  title: string;
}

export function RoutableAccordionButton({
  path,
  title,
}: RoutableAccordionButtonProps) {
  const [location, setLocation] = useLocation();
  const isActive = location === path;

  return (
    <AccordionButton
      _hover={{
        bg: isActive ? 'piperider.400' : 'inherit',
      }}
      color={isActive ? 'white' : 'inherit'}
      bg={isActive ? 'piperider.400' : 'inherit'}
      onClick={() => {
        setLocation(path);
      }}
    >
      <Text fontWeight={'medium'}>{title}</Text>
    </AccordionButton>
  );
}
