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

interface BreadcrumbMetaItem {
  path: string;
  label: string;
}
interface Props {
  routePathToMatch: string;
  height?: number;
}
/**
 * A breadcrumb UI that will use browser location to render breadcrumbs based on the route-params manually provided.
 * FULL_URL1: `/tables/ACTION`
 * BREADCRUMB: `['/', '/tables/ACTION']
 *
 * FULL_URL2: `/tables/ACTION/columns/FOO`
 * BREADCRUMB: `['/', '/tables/ACTION', '/tables/ACTION/columns/FOO']
 *
 * FUTURE?: or by config provision (custom route logic)?
 */
export function SimpleBreadcrumbNav({
  routePathToMatch,
  height = breadcrumbHeight,
  ...props
}: Props & FlexProps) {
  const [location] = useLocation();

  //check if matching params are in location parts,
  const urlSegments = location.split('/');

  const matcherSegments = routePathToMatch.split('/');

  // routable paths by alternate ordering between path_name and path_param (posts/:id)
  const breadcrumbList = urlSegments.reduce<BreadcrumbMetaItem[]>(
    (prev, curr, index) => {
      const matcherItem = matcherSegments[index];
      const isCurrentParam = matcherItem.includes(':');
      if (isCurrentParam) {
        // get breadcrumbUrl (from root to param)
        const breadcrumbUrl = urlSegments.slice(0, index + 1).join('/');
        return [...prev, { path: breadcrumbUrl, label: curr }];
      }
      return prev; // else keep going
    },
    [{ path: '/', label: 'Home' }],
  );

  return (
    <Flex alignItems={'center'} h={`${height}px`} {...props}>
      <Breadcrumb
        fontSize="lg"
        separator={<ChevronRightIcon color="gray.500" boxSize={6} />}
      >
        {breadcrumbList.map(({ label, path }, i) => {
          return (
            <BreadcrumbItem key={i} isCurrentPage={location === path}>
              <BreadcrumbLink
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
