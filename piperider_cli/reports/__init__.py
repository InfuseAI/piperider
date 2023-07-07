import urllib.parse


def embed_url_cli(content: str, url: str, unique_id: str, resource_type: str):
    return content


def embed_url_cloud(content: str, url: str, unique_id: str, resource_type: str):
    return f"[{content}]({url}#/{resource_type}s/{urllib.parse.quote(unique_id)})"


embed_url = None
try:
    from web import patch_sys_path_for_piperider_cli

    patch_sys_path_for_piperider_cli()
    from piperider_cli.dbt.list_task import load_manifest, compare_models_between_manifests

    embed_url = embed_url_cloud
except ImportError:
    from piperider_cli.dbt.list_task import load_manifest, compare_models_between_manifests

    embed_url = embed_url_cli
