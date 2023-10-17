import base64
import json
from typing import Optional

import google.auth
import sqlalchemy
from google.api_core import client_info
from google.auth import impersonated_credentials
from google.cloud import bigquery
from google.oauth2 import service_account

USER_AGENT_TEMPLATE = "sqlalchemy/{}"
SCOPES = (
    "https://www.googleapis.com/auth/bigquery",
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/drive",
)

target_service_account_email: Optional[str] = None


def google_client_info():
    user_agent = USER_AGENT_TEMPLATE.format(sqlalchemy.__version__)
    return client_info.ClientInfo(user_agent=user_agent)


def create_impersonated_bigquery_client(
        credentials_info=None,
        credentials_path=None,
        credentials_base64=None,
        default_query_job_config=None,
        location=None,
        project_id=None,
):
    default_project = None

    if credentials_base64:
        credentials_info = json.loads(base64.b64decode(credentials_base64))

    if credentials_path:
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path
        )
        credentials = credentials.with_scopes(SCOPES)
        default_project = credentials.project_id
    elif credentials_info:
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info
        )
        credentials = credentials.with_scopes(SCOPES)
        default_project = credentials.project_id
    else:
        credentials, default_project = google.auth.default(scopes=SCOPES)

    if project_id is None:
        project_id = default_project

    if target_service_account_email:
        impersonated_creds = impersonated_credentials.Credentials(
            source_credentials=credentials,
            target_principal=target_service_account_email,
            target_scopes=SCOPES,
            lifetime=3600  # Duration for which the token is valid (in seconds)
        )
        return bigquery.Client(
            client_info=google_client_info(),
            project=project_id,
            credentials=impersonated_creds,
            location=location,
            default_query_job_config=default_query_job_config,
        )

    return bigquery.Client(
        client_info=google_client_info(),
        project=project_id,
        credentials=credentials,
        location=location,
        default_query_job_config=default_query_job_config,
    )
