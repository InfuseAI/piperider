import { Grid } from '@chakra-ui/react';
import { Main } from '../components/Common/Main';

export function CRBMPage() {
  return (
    <Main isSingleReport={false}>
      <Grid>This is a business metrics page (CR)</Grid>
    </Main>
  );
}
