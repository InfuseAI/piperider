import { SearchIcon } from '@chakra-ui/icons';
import { InputGroup, InputLeftElement, Input } from '@chakra-ui/react';

interface Props {
  onChange: (search: string) => void;
  filterString?: string;
  placeholder?: string;
}
export function SearchTextInput({
  onChange,
  filterString,
  placeholder,
}: Props) {
  return (
    <InputGroup>
      <InputLeftElement
        pointerEvents={'none'}
        children={<SearchIcon color={'gray.300'} />}
      />
      <Input
        bg={'white'}
        color={'black'}
        type={'text'}
        placeholder={placeholder ?? 'Search Column'}
        value={filterString}
        onChange={({ target }) => onChange(target.value)}
      />
    </InputGroup>
  );
}
