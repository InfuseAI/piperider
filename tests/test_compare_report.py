from unittest import TestCase

from piperider_cli.compare_report import join, ComparisonData, _merge_keys


class CompareReportTests(TestCase):

    def setUp(self) -> None:
        pass

    def tearDown(self) -> None:
        pass

    def test_join(self):
        base = {
            'table_a': {
                'row_count': 50,
                'columns': {
                    'col_a': {
                        'samples': 5
                    }
                }
            },
            'table_b': {
                'row_count': 100,
                'columns': {
                    'col_a': {
                        'samples': 10
                    }
                }
            }
        }

        target = {
            'table_a': {
                'row_count': 50,
                'columns': {
                    'col_a': {
                        'samples': 10
                    }
                }
            },
            'table_b': {
                'row_count': 100,
                'columns': {
                    'col_a': {
                        'samples': 5
                    }
                }
            },
            'table_c': {
                'row_count': 150,
                'columns': {
                    'col_a': {
                        'samples': 15
                    }
                }
            }
        }

        result = join(base, target)
        self.assertEqual(len(result.keys()), 3)
        self.assertListEqual(list(result.keys()), ['table_a', 'table_b', 'table_c'])
        self.assertEqual(len(result['table_a'].keys()), 2)

        joined_table = result['table_b']
        columns_b = joined_table.get('base', {}).get('columns') if joined_table.get('base') else None
        columns_t = joined_table.get('target', {}).get('columns') if joined_table.get('target') else None
        joined_columns = join(columns_b, columns_t)
        joined_column = joined_columns['col_a']

        b = joined_column.get('base')
        t = joined_column.get('target')

        samples_b = b.get('samples', 0) if b else None
        samples_t = t.get('samples', 0) if t else None

        self.assertEqual(samples_b, 10)
        self.assertEqual(samples_t, 5)

        joined_table = result['table_c']
        columns_b = joined_table.get('base', {}).get('columns') if joined_table.get('base') else None
        columns_t = joined_table.get('target', {}).get('columns') if joined_table.get('target') else None
        joined_columns = join(columns_b, columns_t)
        joined_column = joined_columns['col_a']

        b = joined_column.get('base')
        t = joined_column.get('target')

        samples_b = b.get('samples', 0) if b else None
        samples_t = t.get('samples', 0) if t else None

        self.assertEqual(samples_b, None)
        self.assertEqual(samples_t, 15)

    def test_merge_keys(self):
        self.assertEqual(['a', 'b', 'c', 'd', 'e'], _merge_keys(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'e']))
        self.assertEqual(['a', 'b', 'c', 'd', 'e'], _merge_keys(['a', 'b', 'c', 'e'], ['a', 'b', 'd', 'e']))
        self.assertEqual(['a', 'z', 'b', 'c', 'd'], _merge_keys(['a', 'b', 'c', 'd'], ['z', 'b', 'c', 'd']))
        self.assertEqual(['a', 'b', 'c', 'd', 'e'], _merge_keys(['a', 'b', 'c', 'd'], ['a', 'd', 'e']))
        self.assertEqual(['a', 'b', 'z', 'c', 'd'], _merge_keys(['a', 'b', 'c', 'd'], ['a', 'b', 'z', 'c', 'd']))
        self.assertEqual(['z', 'a', 'b', 'c', 'd'], _merge_keys(['a', 'b', 'c', 'd'], ['z', 'a', 'b', 'c', 'd']))
        self.assertEqual(['a', 'b', 'c', 'd'], _merge_keys(['a', 'b'], ['c', 'd']))
