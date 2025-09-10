# backend/agents/nutrition_agent.py
import os
import logging
from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from scopes import NUTRITION_DIETPLAN
from auth import verify_descope_token
import re  # For sanitization

load_dotenv()
OPENAI_API_KEY = os.environ["OPENAI_API_KEY_TRAIN_NUTRI"]

logging.basicConfig(level=logging.INFO)

system_prompt = SystemMessagePromptTemplate.from_template(
    "You are a professional nutrition expert. Provide concise, accurate advice on diet, macros, vitamins, minerals, and fitness-focused nutrition. You can also give a diet plan "
    "Respond only with information directly related to food, diet, calories, protein, carbohydrates, fats, micronutrients, hydration, and meal timing. "
    "Do NOT provide detailed exercise, workout, or training plans—that is handled by the Trainer Agent. "
    "When the user asks about nutritional values or meal composition, provide a clear breakdown including calories, protein, carbs, fats, and relevant micronutrients. "
    "Respond in a professional yet friendly manner. Handle casual user queries appropriately, but always relate to nutrition and health. "
    "Always ensure responses are safe, professional, and free of sensitive details. "
    "Never expose sensitive information like API keys, passwords, or secrets. "
    "Do not use emojis, markdown, bold formatting, or asterisks. "
    "If the query includes exercise or training questions, acknowledge briefly and defer to the Trainer Agent."
)


user_prompt_template = HumanMessagePromptTemplate.from_template("{user_query}")
chat_prompt = ChatPromptTemplate.from_messages([system_prompt, user_prompt_template])

# Utility to sanitize chat content
def sanitize_text(text: str) -> str:
    # Remove only asterisks (*) and hashtags (#)
    text = re.sub(r"[*#]", "", text)
    return text


async def nutrition_node(state: dict, context: dict) -> dict:
    token = context.get("token")
    user_query = state.get("user_query", "")
    caller = context.get("caller", "User")
    chat_history = state.get("chat_history", [])  # List of prior messages

    logging.info(f"[NutritionAgent] Invoked by: {caller}")

    if not token:
        state["nutrition_response"] = "⛔ Missing token"
        return state

    try:
        await verify_descope_token(token, NUTRITION_DIETPLAN)
    except Exception as e:
        state["nutrition_response"] = f"⛔ Unauthorized: {str(e)}"
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
    response_text = sanitize_text(response.content)
    state["nutrition_response"] = response_text


    return state
