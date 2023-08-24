import os
import platform
import subprocess


def remove_link(link_path):
    try:
        if platform.system() == 'Windows':
            if os.path.exists(link_path):
                subprocess.run(["rmdir", link_path], shell=True, check=True)
        else:
            if os.path.exists(link_path) or os.path.islink(link_path):
                os.unlink(link_path)
    except OSError as e:
        raise e


def create_link(source: str, target: str):
    if not os.path.isabs(source):
        raise ValueError(f'source must be abspath: {source}')
    if not os.path.isabs(target):
        raise ValueError(f'target must be abspath: {target}')

    remove_link(target)

    # Check the platform
    if platform.system() == "Windows":
        # On Windows, try creating a junction
        try:
            subprocess.run(["mklink", "/J", target, source], shell=True, check=True,
                           stderr=subprocess.DEVNULL,
                           stdout=subprocess.DEVNULL)
        except subprocess.CalledProcessError as e:
            raise e
    else:
        # On non-Windows platforms, create a symbolic link
        os.symlink(source, target)
