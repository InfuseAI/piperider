import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Link,
} from '@chakra-ui/react';
import { FiDatabase, FiGrid } from 'react-icons/fi';
import { useLocation, useRoute, useRouter } from 'wouter';

/**
 * A breadcrumb ui that will use browser location to render breadcrumbs, using an alternating pathing order of /<path_name>/:<param_name>.
 * Example: /tables/5/columns/2  --> [/, 5 , 2 ]
 * Example: /posts/1 --> [/, 1]
 */
export function BreadcrumbNavbar() {
  const [location] = useLocation();
  // const [, params] = useRoute('');
  // const router = useRouter();
  console.log({ location });

  return (
    <Box h={'5'} bg={'darkblue'}>
      <Breadcrumb fontSize="lg">
        <BreadcrumbItem>
          <Link href="/">
            <Flex alignItems="center" gap={1}>
              <FiDatabase /> breadcrumb
            </Flex>
            {/* <BreadcrumbLink href="/" data-cy="sr-report-breadcrumb-back">
            </BreadcrumbLink> */}
          </Link>
        </BreadcrumbItem>
        {/* <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="#">
            <Flex alignItems="center" gap={1}>
              <FiGrid /> {table.name}
            </Flex>
          </BreadcrumbLink>
        </BreadcrumbItem> */}
      </Breadcrumb>
    </Box>
  );
}
