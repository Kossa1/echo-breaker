"""Lightweight Reddit API helper using a stored refresh token.

This module expects you to already have completed the one-time OAuth flow and
saved the refresh token in an environment variable. Each call will ensure a
valid access token (cached in-memory until near expiry) and then hit Reddit's
OAuth API endpoints.

Environment variables required:
  REDDIT_CLIENT_ID       (script app client id)
  REDDIT_CLIENT_SECRET   (script app client secret)
  REDDIT_REFRESH_TOKEN   (refresh token obtained from auth flow)
Optional:
  REDDIT_USER_AGENT      (identify your app; defaults to 'RedditAPIClient/0.1')

Usage example (run as script):
  python redditapi.py me
  python redditapi.py hot python 5
"""

from __future__ import annotations

import os
import time
import sys
from typing import Any, Dict, Optional

import requests
import dotenv

dotenv.load_dotenv()

TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
OAUTH_BASE = "https://oauth.reddit.com"

CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("REDDIT_REFRESH_TOKEN")
USER_AGENT = os.getenv("REDDIT_USER_AGENT", "RedditAPIClient/0.1")

_cached_access_token: Optional[str] = None
_cached_expiry_epoch: float = 0.0  # epoch seconds when token expires


def _validate_env() -> None:
    """Ensure required environment variables are set."""
    if not CLIENT_ID or not CLIENT_SECRET or not REFRESH_TOKEN:
        raise RedditAuthError(
            "Missing required environment variables: "
            "REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN"
        )


class RedditAuthError(RuntimeError):
    """Raised when authentication / token retrieval fails."""



def get_access_token(force_refresh: bool = False) -> str:
    """Return a valid access token, refreshing if necessary.

    force_refresh: bypass cache and always hit the token endpoint.
    """
    global _cached_access_token, _cached_expiry_epoch
    _validate_env()

    # Refresh 60s early as a safety buffer
    if not force_refresh and _cached_access_token and time.time() < _cached_expiry_epoch - 60:
        return _cached_access_token

    auth = requests.auth.HTTPBasicAuth(CLIENT_ID, CLIENT_SECRET)
    data = {"grant_type": "refresh_token", "refresh_token": REFRESH_TOKEN}
    headers = {"User-Agent": USER_AGENT}

    try:
        resp = requests.post(TOKEN_URL, auth=auth, data=data, headers=headers, timeout=30)
    except requests.RequestException as exc:
        raise RedditAuthError(f"Network error retrieving access token: {exc}") from exc

    if resp.status_code != 200:
        raise RedditAuthError(
            f"Failed to refresh token (status {resp.status_code}): {resp.text[:300]}"
        )
    payload = resp.json()
    if "access_token" not in payload:
        raise RedditAuthError(f"Unexpected token payload: {payload}")

    _cached_access_token = payload["access_token"]
    expires_in = payload.get("expires_in", 3600)
    _cached_expiry_epoch = time.time() + int(expires_in)
    return _cached_access_token


def reddit_request(
    method: str,
    path: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    json: Optional[Any] = None,
    raw: bool = False,
) -> Any:
    """Generic request helper.

    path: either full URL or a path like '/api/v1/me'.
    raw: if True returns the Response object, else JSON-decoded body.
    Raises requests.HTTPError for non-2xx responses.
    """
    token = get_access_token()
    url = path if path.startswith("http") else f"{OAUTH_BASE}{path}"
    headers = {"Authorization": f"bearer {token}", "User-Agent": USER_AGENT}
    resp = requests.request(
        method.upper(), url, headers=headers, params=params, data=data, json=json, timeout=30
    )
    if resp.status_code == 401:
        # Possibly expired early; try one refresh automatically
        token = get_access_token(force_refresh=True)
        headers["Authorization"] = f"bearer {token}"
        resp = requests.request(
            method.upper(), url, headers=headers, params=params, data=data, json=json, timeout=30
        )
    resp.raise_for_status()
    return resp if raw else resp.json()


def reddit_get(path: str, **kwargs: Any) -> Any:
    return reddit_request("GET", path, **kwargs)


def reddit_post(path: str, **kwargs: Any) -> Any:
    return reddit_request("POST", path, **kwargs)


def _print_json(obj: Any) -> None:
    import json as _json
    print(_json.dumps(obj, indent=2))

