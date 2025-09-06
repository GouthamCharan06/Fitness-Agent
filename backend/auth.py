# backend/utils/auth.py
import logging
from fastapi import HTTPException
from utils.descope_utils import verify_scope

logging.basicConfig(level=logging.INFO)

async def verify_descope_token(token: str, required_scope: str, return_payload: bool = False):
    """
    Verify JWT token string using Descope SDK and ensure required scope.
    Raises HTTPException if token is missing, invalid, or required scope is not present.

    Args:
        token (str): JWT token string (without "Bearer " prefix)
        required_scope (str): Scope required for the operation
        return_payload (bool): If True, returns the validated payload from Descope

    Returns:
        bool or dict: True if only validation is needed, or payload dict if return_payload=True
    """
    if not token:
        logging.warning("[Auth] Missing token")
        raise HTTPException(status_code=401, detail="Missing token")

    logging.info(f"[Auth] Token received: {token[:20]}...")  # Partial token for safety

    try:
        # Validate token and check for the required scope using Descope utils
        payload = await verify_scope(token, required_scope)
        if not payload:
            logging.warning(f"[Auth] Missing required scope: {required_scope}")
            raise HTTPException(status_code=403, detail=f"Missing required scope: {required_scope}")

        logging.info(f"[Auth] Scope '{required_scope}' verified successfully")
        return payload if return_payload else True

    except Exception as e:
        logging.error(f"[Auth] Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
