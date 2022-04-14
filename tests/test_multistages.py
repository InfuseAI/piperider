import os
import shutil
import tempfile
from glob import glob
from unittest import TestCase


class MultiStagesTest(TestCase):

    def setUp(self) -> None:
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as tmpdir:
            self.project_dir = os.path.join(tmpdir, 'piperider')

    def test_multi_stages(self):
        # prepare data
        testdata = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'testdata-multistages')
        shutil.copytree(testdata, self.project_dir)
        os.system(f'tree {self.project_dir}')

        with tempfile.TemporaryDirectory() as working_directory:
            print(f'working directory: {working_directory}')
            os.chdir(working_directory)
            shutil.copy(os.path.join(testdata, 'testcase.csv'), working_directory)
            os.system('pwd')
            os.system('ls -alh')

            multistages_dir = os.path.join(testdata, 'stages', '*.yaml')
            multistages = ' '.join(glob(multistages_dir))
            print(multistages)

            # uncomment it for debug
            keep_ge_workspace = ''
            # keep_ge_workspace = '--keep-ge-workspace'

            # run stages by directory
            os.system(f'piperider-cli run {multistages} {keep_ge_workspace}')

            # check all stages reports
            stages = set(['multi_m_s1', 'multi_m_s3', 'multi1_m_s2', 'multi1_m_local'])
            found_stages = []
            for f in glob('./*$*_ydata.json'):
                found_stages.append(os.path.basename(f).split('$')[0])

            self.assertEqual(stages, set(found_stages))
