# backend/main.py
import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import re
import httpx
from backend.agents.trainer_agent import trainer_node
from backend.agents.nutrition_agent import nutrition_node
from backend.agents.recovery_agent import recovery_node
from backend.scopes import TRAINER_SUGGEST, NUTRITION_DIETPLAN, RECOVERY_COLLECT
from backend.auth import verify_descope_token

# Load environment variables
load_dotenv()
user_states= {}

# Initialize FastAPI
app = FastAPI(title="Fitness Backend")

# CORS configuration
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO)

# LLM for intent classification
orchestrator_llm = ChatOpenAI(
    model_name="gpt-4o-mini",
    temperature=0,
    openai_api_key=os.environ.get("OPENAI_API_KEY"),
)

# Intent classifier prompt (base)
intent_prompt = ChatPromptTemplate.from_template(
    """You are an intent classifier. User says:
"{user_input}"
Decide if the query is about:
- "trainer"
- "nutrition"
- "recovery"
- "both"
- "casual"
Return only one word."""
)

# Map intents to agent flows
INTENT_TO_FLOW = {
    "trainer": ["trainer"],
    "nutrition": ["nutrition"],
    "recovery": ["recovery"],
    "both": ["trainer", "nutrition"],
    "casual": [],
}


async def classify_intent(user_input: str, history_text: str | None = None, last_agent_context: str | None = None) -> str:
    """
    Classify intent. If history_text is provided, include it in the prompt for context-aware classification.
    Returns one of: trainer, nutrition, recovery, both, casual (defaults to casual on error).
    """
    try:
        logging.info("[Intent] Classifying intent for user input: %s", user_input)
        if history_text:
            prompt_template = ChatPromptTemplate.from_template(
                f"""You are an intent classifier. Consider the following conversation history and current input:
{history_text}

Current user input:
{user_input}

Decide if the query is about:
- "trainer"
- "nutrition"
- "recovery"
- "both"
- "casual"
Return only one word."""
            )
            chain = prompt_template | orchestrator_llm
            result = (await chain.ainvoke({})).content.strip().lower()
        else:
            chain = intent_prompt | orchestrator_llm
            result = (await chain.ainvoke({"user_input": user_input})).content.strip().lower()

        intent_result = result.split()[0] if result else "casual"
        logging.info("[Intent] Classified intent: %s", intent_result)
        return intent_result
    except Exception as e:
        logging.error("[Intent] Error classifying intent: %s", e)
        return "casual"


class AgentQuery(BaseModel):
    user_id: str = "anonymous"
    context: str
    consent_granted: bool = False  # Added for inter-agent consent


# Root and health endpoints
@app.get("/")
def root():
    logging.info("[Root] Health check root endpoint hit")
    return {"status": "ok", "message": "Welcome to Fitness Backend"}


@app.get("/health")
def health_check():
    logging.info("[Health] Health check endpoint hit")
    return {"status": "ok", "message": "Backend running"}


def sanitize_text(text: str) -> str:
    # Remove only asterisks (*) and hashtags (#)
    return re.sub(r"[*#]", "", text)


# Main agent query endpoint
@app.post("/agent_query")
async def agent_query(request: Request):
    logging.info("[Orchestrator] /agent_query called")

    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        logging.warning("[Auth] Missing Authorization header")
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ", 1)[1]

    # Parse request body once (robust to raw text bodies)
    body_data = {}
    try:
        body_data = await request.json()
    except Exception:
        raw = await request.body()
        try:
            # Try decode fallback
            body_text = raw.decode("utf-8")
            body_data = {"context": body_text}
        except Exception:
            body_data = {}

    # Build AgentQuery safely
    try:
        query = AgentQuery(**body_data)
    except Exception:
        # If body doesn't fit model, use context-only fallback
        context_val = body_data.get("context") or ""
        query = AgentQuery(context=context_val)

    logging.info("[Query] User query: %s", query.context)

    # Initialize state cleanly (avoid referencing state before defined)
    state = {"user_query": query.context, "chat_history": []}

    # Attach any fitbit token from request body
    fitbit_token = body_data.get("fitbit_token") or None
    if fitbit_token:
        state["fitbit_token"] = fitbit_token
        logging.info("[Orchestrator] Fitbit token detected and added to state")

    # Map manual_data from frontend (if present) into state as expected by recovery_agent
    manual_data = body_data.get("manual_data") or {}
    # Accept both shapes: {sleep_hours:.. protein_grams:..} or {manual_sleep_hours:.. manual_protein_grams:..}
    if manual_data:
        # Normalize keys into manual_sleep_hours and manual_protein_grams
        sleep_val = manual_data.get("manual_sleep_hours") or manual_data.get("sleep_hours") or manual_data.get("sleep")
        protein_val = manual_data.get("manual_protein_grams") or manual_data.get("protein_grams") or manual_data.get("protein")
        if sleep_val is not None:
            state["manual_sleep_hours"] = sleep_val
            logging.info("[Orchestrator] Manual sleep provided: %s", sleep_val)
        if protein_val is not None:
            state["manual_protein_grams"] = protein_val
            logging.info("[Orchestrator] Manual protein provided: %s", protein_val)

    # Append current user query to history
    state.setdefault("chat_history", []).append({"role": "user", "content": query.context})
    # Keep only last 15 messages
    state["chat_history"] = state["chat_history"][-15:]
    history_text = "\n".join([f"{m['role']}: {sanitize_text(m['content'])}" for m in state["chat_history"]])

    # Detect follow-up
    followup_keywords = ["this", "that", "it", "more", "why", "again", "details", "how", "explain", "clarify"]
    is_followup = any(word in query.context.lower() for word in followup_keywords)

    # Grab last agent responses for context if it's follow-up
    last_agent_context = ""
    if is_followup:
        relevant_keys = ["trainer_response", "nutrition_response", "recovery_response"]
        last_responses = [state.get(k) for k in relevant_keys if state.get(k)]
        if last_responses:
            last_agent_context = "\nPrevious relevant responses:\n" + "\n".join(last_responses)

    try:
        # Classify intent using history-aware prompt
        logging.info("[Intent] Classifying intent with conversation history")
        intent_input = f"Conversation so far:\n{history_text}\n\nCurrent user input:\n{sanitize_text(query.context)}"
        if last_agent_context:
            intent_input += f"{last_agent_context}"
        intent = await classify_intent(sanitize_text(query.context), history_text=history_text, last_agent_context=last_agent_context)
        intent = intent if intent in INTENT_TO_FLOW else "casual"
        logging.info("[Intent] Classified intent: %s", intent)

        flow = INTENT_TO_FLOW.get(intent, ["trainer"])
        logging.info("[Orchestrator] Flow determined: %s", flow)

        # Inter-agent consent check
        consent_needed_agents = []
        if not query.consent_granted and any(a in flow for a in ["trainer", "nutrition", "recovery"]):
            consent_needed_agents = flow
            # Fitbit consent specifically for recovery agent
            fitbit_needed = "recovery" in flow and not state.get("fitbit_token")
            consent_message = f"Agent: {', '.join(consent_needed_agents)} need your consent to read your query/data. This is necessary to invoke the respective agents and give an accurate response. Don't worry, your information is protected. Do you want to Proceed?"
            if fitbit_needed:
                consent_message += " Fitbit authentication is required for recovery data."
            logging.info("[Consent] Consent required for agents: %s", consent_needed_agents)
            # Always return consistent shape
            return {
                "user_id": query.user_id,
                "intent": "consent",
                "consent_required": True,
                "message": consent_message,
                "agents": consent_needed_agents,
            }

        # Trainer agent
        if "trainer" in flow:
            try:
                await verify_descope_token(token, TRAINER_SUGGEST)
                logging.info("[Orchestrator] Invoking TrainerAgent")
                state = await trainer_node(state, {"token": token, "caller": "orchestrator"})
                logging.info("[TrainerAgent] Response: %s", state.get("trainer_response"))
            except HTTPException:
                state["trainer_response"] = "Unauthorized: Missing trainer scope"
                logging.warning("[TrainerAgent] Unauthorized access attempt")

        # Nutrition agent
        if "nutrition" in flow:
            try:
                await verify_descope_token(token, NUTRITION_DIETPLAN)
                logging.info("[Orchestrator] Invoking NutritionAgent")
                state = await nutrition_node(state, {"token": token, "caller": "orchestrator"})
                logging.info("[NutritionAgent] Response: %s", state.get("nutrition_response"))
            except HTTPException:
                state["nutrition_response"] = "Unauthorized: Missing nutrition scope"
                logging.warning("[NutritionAgent] Unauthorized access attempt")

        # Recovery agent
        if "recovery" in flow:
            try:
                await verify_descope_token(token, RECOVERY_COLLECT)
                logging.info("[Orchestrator] Invoking RecoveryAgent")
                state = await recovery_node(
                    state, {"token": token, "caller": "orchestrator"}, trainer_node=trainer_node, nutrition_node=nutrition_node
                )
                logging.info("[RecoveryAgent] Response: %s", state.get("recovery_response"))
            except HTTPException:
                state["recovery_response"] = "Unauthorized: Missing recovery scope"
                logging.warning("[RecoveryAgent] Unauthorized access attempt")

        # Casual intent handling
        if intent == "casual":
            logging.info("[Orchestrator] Handling casual intent")
            casual_prompt_text = f"""
Conversation history:
{history_text}
User said: {sanitize_text(query.context)}.
Respond casually but only about workouts, nutrition, or recovery. 
If unrelated, give a polite fallback.
No emoji's, special symbols, or asterisks in your response.
"""
            casual_prompt_text = casual_prompt_text.replace("{", "{{").replace("}", "}}")
            casual_chain = ChatPromptTemplate.from_template(casual_prompt_text) | orchestrator_llm
            message = (await casual_chain.ainvoke({})).content
            message = sanitize_text(message)
            # Append assistant message to history
            state.setdefault("chat_history", []).append({"role": "assistant", "content": message})
            logging.info("[Casual] Response generated")
            return {"user_id": query.user_id, "message": message, "intent": intent, **state}

        # Combine responses from agents, deduplicate, preserve all lines
        response_parts = []
        seen_texts = set()
        for key in ["trainer_response", "nutrition_response", "recovery_response"]:
            if key in state and state.get(key):
                sanitized_response = sanitize_text(state[key])
                # Deduplicate ignoring case
                if sanitized_response.lower() in seen_texts:
                    continue
                seen_texts.add(sanitized_response.lower())
                header = key.replace("_", " ").upper() + ":"
                response_parts.append(f"{header}\n{sanitized_response}")
                # Append assistant message to history
                state.setdefault("chat_history", []).append({"role": "assistant", "content": sanitized_response})

        message = "\n\n".join(response_parts) if response_parts else "Couldn't understand query."
        state["invocation_log"] = state.get("invocation_log", [])
        logging.info("[Orchestrator] Returning combined message with history")
        return {"user_id": query.user_id, "message": message, "intent": intent, **state}

    except Exception as e:
        logging.exception("[Orchestrator] Unexpected error in /agent_query")
        # Return consistent error shape
        return JSONResponse(status_code=500, content={"user_id": query.user_id if 'query' in locals() else "anonymous", "message": str(e), "intent": "error"})


# Fitbit OAuth callback endpoint
class FitbitCallbackRequest(BaseModel):
    fitbit_code: str
    code_verifier: str
    user_jwt: str = None  # Optional: Descope JWT for verifying user


@app.post("/api/auth/verify/fitbit/callback")
async def fitbit_callback(req: FitbitCallbackRequest):
    logging.info("[Fitbit] Callback received with code")
    try:
        # Optional: Verify Descope JWT if provided
        if req.user_jwt:
            try:
                await verify_descope_token(req.user_jwt, RECOVERY_COLLECT)
                logging.info("[Fitbit] User JWT verified")
            except Exception as e:
                logging.warning("[Fitbit] Invalid user JWT: %s", e)
                raise HTTPException(status_code=401, detail="Invalid JWT")

        # Ensure code_verifier is provided for PKCE
        code_verifier = getattr(req, "code_verifier", None)
        if not code_verifier:
            logging.error("[Fitbit] Missing code_verifier for PKCE")
            raise HTTPException(status_code=400, detail="Missing code_verifier for PKCE")

        # Exchange Fitbit code for access & refresh token using PKCE
        token_url = "https://api.fitbit.com/oauth2/token"
        client_id = os.environ.get("FITBIT_CLIENT_ID")
        client_secret = os.environ.get("FITBIT_CLIENT_SECRET")
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "client_id": client_id,
            "grant_type": "authorization_code",
            "code": req.fitbit_code,
            "code_verifier": code_verifier,
            "redirect_uri": f"{os.environ.get('FRONTEND_URL')}/api/auth/verify/fitbit/callback",
        }
        auth = (client_id, client_secret)
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, headers=headers, data=data, auth=auth)
            if response.status_code != 200:
                logging.error("[Fitbit] Token exchange failed: %s", response.text)
                raise HTTPException(status_code=500, detail="Fitbit token exchange failed")
            tokens = response.json()

        # Store tokens securely (DB, cache, or user session)
        logging.info("[Fitbit] Tokens received successfully: %s", tokens)
        return {"status": "ok", "tokens": tokens}
    except Exception as e:
        logging.exception("[Fitbit] Error handling callback")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear_chat")
async def clear_chat(request: Request):
    try:
    
        try:
            data = await request.json()
        except Exception:
            data = {}
        
        
        user_id = data.get("user_id") or "anonymous"

        global user_states
        
        if user_id not in user_states:
            user_states[user_id] = {"chat_history": []}
        else:
            user_states[user_id]["chat_history"] = []

        return {"status": "ok", "message": "Chat cleared successfully", "user_id": user_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})