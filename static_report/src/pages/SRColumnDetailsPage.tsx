import { Flex } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { Main } from '../components/shared/Main';

export function SRColumnDetailsPage() {
  const [match, params] = useRoute('/tables/:reportName/columns/:columnName');

  if (!params?.columnName) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile data found.
        </Flex>
      </Main>
    );
  }
  return <h1>params found</h1>;
}
