# backend/agents/trainer_agent.py
import os
import logging
from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from backend.scopes import TRAINER_SUGGEST
from backend.auth import verify_descope_token
import re  # For sanitization

load_dotenv()
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
MUSCLEWIKI_URL = "https://musclewiki.com"

logging.basicConfig(level=logging.INFO)

system_prompt = SystemMessagePromptTemplate.from_template(
    "You are a professional and approachable gym trainer. You can give a training plan too "
    "Provide accurate, concise exercise and fitness guidance. "
    "Respond only with information directly related to physical training, workouts, exercises, sets, reps, recovery, and muscle targeting. "
    "Do NOT provide detailed nutritional, calorie, or meal plan information—that is handled by the Nutrition Agent. "
    "If the user asks casual or small-talk questions, reply in a friendly but fitness-oriented way without adding nutrition advice. "
    "Always ensure responses are safe, professional, and free of sensitive details. "
    f"Reference {MUSCLEWIKI_URL} when giving exercise suggestions. "
    "Do not use emojis, markdown, bold formatting, or asterisks. "
    "If the query includes nutrition or diet, only acknowledge it briefly and defer to the Nutrition Agent."
)

user_prompt_template = HumanMessagePromptTemplate.from_template("{user_query}")
chat_prompt = ChatPromptTemplate.from_messages([system_prompt, user_prompt_template])

# Utility to sanitize chat content
def sanitize_text(text: str) -> str:
    # Remove only asterisks (*) and hashtags (#)
    text = re.sub(r"[*#]", "", text)
    return text

# Utility to append MuscleWiki clickable URL
def append_musclewiki_clickable(response: str) -> str:
    if MUSCLEWIKI_URL not in response:
        response += f'\n\nFor exercise references, visit: <a href="{MUSCLEWIKI_URL}" target="_blank">musclewiki.com</a>'
    return response

async def trainer_node(state: dict, context: dict) -> dict:
    token = context.get("token")
    user_query = state.get("user_query", "")
    chat_history = state.get("chat_history", [])  # List of prior messages

    logging.info(f"[TrainerAgent] Invoked by: {context.get('caller', 'User')}")

    if not token:
        state["trainer_response"] = "⛔ Missing token"
        return state

    try:
        await verify_descope_token(token, TRAINER_SUGGEST)
    except Exception as e:
        state["trainer_response"] = f"⛔ Unauthorized: {str(e)}"
        return state

    # Combine sanitized chat history into user query
    history_text = ""
    if chat_history:
        sanitized_history = [sanitize_text(msg.get("content", "")) for msg in chat_history]
        history_text = "\n".join(f"User: {h}" for h in sanitized_history)
        user_query = f"{history_text}\nUser: {sanitize_text(user_query)}"

    llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.7, openai_api_key=OPENAI_API_KEY)
    messages = chat_prompt.format_messages(user_query=user_query)
    response = await llm.ainvoke(messages)

    # Sanitize and append clickable MuscleWiki URL
    response_text = sanitize_text(response.content)
    response_text = append_musclewiki_clickable(response_text)
    state["trainer_response"] = response_text

    # Append trainer message to chat history
    state.setdefault("chat_history", []).append({"role": "assistant", "content": response_text})

    return state
