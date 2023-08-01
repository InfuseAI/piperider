import { mergeKeys } from '../mergeKeys';

test('should merge keys from base and target arrays while preserving order', () => {
  const base = ['id', 'name', 'age', 'email'];
  const target = ['name', 'age', 'city'];

  const result = mergeKeys(base, target);

  // The expected result after merging is: ['id', 'name', 'age', 'city', 'email']
  expect(result).toEqual(['id', 'name', 'age', 'email', 'city']);
});

test('should merge keys from base and target arrays while preserving order (case 2)', () => {
  const base = ['id', 'name', 'age', 'city'];
  const target = ['id', 'fullname', 'age', 'city'];

  const result = mergeKeys(base, target);

  // The expected result after merging is: ['id', 'name', 'age', 'city', 'email']
  expect(result).toEqual(['id', 'name', 'fullname', 'age', 'city']);
});

test('should handle empty arrays', () => {
  const base = [];
  const target = ['name', 'age', 'city'];

  const result = mergeKeys(base, target);

  // The expected result is the target array itself when the base array is empty
  expect(result).toEqual(target);
});

test('should handle duplicate keys in base and target arrays', () => {
  const base = ['id', 'name', 'age', 'email'];
  const target = ['name', 'age', 'id', 'city', 'name'];

  const result = mergeKeys(base, target);

  expect(result).toEqual(['name', 'age', 'id', 'email', 'city']);
});

test('should handle both arrays having the same keys', () => {
  const base = ['id', 'name', 'age'];
  const target = ['id', 'name', 'age'];

  const result = mergeKeys(base, target);

  // The expected result after merging is the same as the base array
  expect(result).toEqual(base);
});
