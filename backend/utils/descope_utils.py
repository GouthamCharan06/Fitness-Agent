# backend/utils/descope_utils.py
import os
import logging
from descope import DescopeClient
from dotenv import load_dotenv
import asyncio

load_dotenv()

DESCOPE_PROJECT_ID = os.environ.get("DESCOPE_PROJECT_ID")
descope_client = DescopeClient(project_id=DESCOPE_PROJECT_ID)

async def verify_scope(token: str, required_scope: str) -> bool:
    """
    Verify that the given JWT contains the required scope using Descope.
    Handles sync validate_session in async context.
    """
    try:
        # Run validate_session in a thread if it is synchronous
        resp = await asyncio.to_thread(descope_client.validate_session, token)

        # Log full response for debugging
        logging.info(f"[DescopeUtils] validate_session response: {resp}")

        
        scopes = resp.get("scope", [])
        logging.info(f"[DescopeUtils] Extracted scopes: {scopes}")

        if required_scope in scopes:
            logging.info(f"[DescopeUtils] Required scope '{required_scope}' verified")
            return True
        else:
            logging.warning(f"[DescopeUtils] Missing required scope '{required_scope}'")
            return False

    except Exception as e:
        logging.warning(f"[DescopeUtils] Token verification failed: {e}")
        return False
