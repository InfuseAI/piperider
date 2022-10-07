import { SearchIcon } from '@chakra-ui/icons';
import { Flex, InputGroup, InputLeftElement, Input } from '@chakra-ui/react';
import { useState } from 'react';
import { Main } from '../components/shared/Layouts/Main';
import { AssertionListWidget } from '../components/shared/Widgets/AssertionListWidget';
import { ComparisonReportSchema } from '../types';
import { tableListWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';

interface Props {
  data: ComparisonReportSchema;
}
export function CRAssertionListPage({ data: { base, input } }: Props) {
  const [filterString, setFilterString] = useState<string>('');
  const setRawReport = useReportStore((s) => s.setReportRawData);
  setRawReport({ base, input });
  const { tableColumnAssertionsOnly } = useReportStore.getState();
  return (
    <Main isSingleReport={false}>
      <Flex justify={'center'} w={tableListWidth} m={14}>
        <InputGroup my={2}>
          <InputLeftElement
            pointerEvents={'none'}
            children={<SearchIcon color={'gray.300'} />}
          />
          <Input
            bg={'white'}
            color={'black'}
            type={'text'}
            placeholder="Find By Assertion or Test Subject (Table, Column)"
            value={filterString}
            onChange={({ target }) => setFilterString(target.value)}
          />
        </InputGroup>
      </Flex>
      <AssertionListWidget
        assertionList={tableColumnAssertionsOnly}
        filterString={filterString}
      />
    </Main>
  );
}
