import hashlib
import os.path


def schema_version():
    import piperider_cli.profiler as p
    schema_def = os.path.join(os.path.dirname(p.__file__), 'schema.json')
    with open(schema_def) as fh:
        m = hashlib.md5()
        m.update(fh.read().encode())
        return m.hexdigest()


if __name__ == '__main__':
    print(schema_version())
