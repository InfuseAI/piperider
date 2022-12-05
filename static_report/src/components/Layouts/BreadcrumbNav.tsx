import { ChevronRightIcon } from '@chakra-ui/icons';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  FlexProps,
} from '@chakra-ui/react';
import { Link, useLocation } from 'wouter';
import { breadcrumbHeight } from '../../utils/layout';

export interface BreadcrumbMetaItem {
  path: string;
  label: string;
}
interface Props {
  breadcrumbList: BreadcrumbMetaItem[];
}
/**
 * A simple breadcrumb UI that will use browser location to render breadcrumbs based on the path/label manually provided.
 */
export function BreadcrumbNav({ breadcrumbList, ...props }: Props & FlexProps) {
  const [location] = useLocation();

  return (
    <Flex
      alignItems={'center'}
      h={`${breadcrumbHeight}px`}
      p={4}
      borderBottom="1px solid"
      borderBottomColor="gray.300"
      {...props}
    >
      <Breadcrumb
        fontSize="lg"
        separator={<ChevronRightIcon color="gray.500" boxSize={6} />}
      >
        {breadcrumbList
          .filter((v) => v.label && v.path)
          .map(({ label, path }, i) => {
            return (
              <BreadcrumbItem key={i} isCurrentPage={location === path}>
                <BreadcrumbLink
                  data-cy="breadcrumb-link"
                  to={path}
                  as={Link}
                  cursor={'pointer'}
                  display={'flex'}
                  alignItems={'center'}
                >
                  {decodeURIComponent(label)}
                </BreadcrumbLink>
              </BreadcrumbItem>
            );
          })}
      </Breadcrumb>
    </Flex>
  );
}
