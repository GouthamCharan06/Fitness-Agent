# backend/agents/recovery_agent.py
import os
import logging
from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate
from backend.scopes import RECOVERY_COLLECT, RECOVERY_INVOKE_TRAINER, RECOVERY_INVOKE_NUTRITION
from backend.auth import verify_descope_token
import re
import httpx
import datetime
from typing import Dict

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
logging.basicConfig(level=logging.INFO)

# System & user prompt templates
system_prompt = SystemMessagePromptTemplate.from_template(
    "You are a professional and empathetic advisor for recovery, nutrition, and fitness. "
    "Provide clear and actionable advice based on user inputs and health data. "
    "Respond in a human-like style. Keep responses safe and avoid disclosing sensitive info. "
    "No emojis, symbols or asterisks."
)
user_prompt = HumanMessagePromptTemplate.from_template("{user_query}")
chat_prompt = ChatPromptTemplate.from_messages([system_prompt, user_prompt])


def sanitize_text(text: str):
    return re.sub(r"[*#]", "", text)


async def fetch_fitbit_data(fitbit_token: str):
    """
    Fetch Fitbit data with detailed logging. Returns a dict of all available metrics.
    """
    headers = {"Authorization": f"Bearer {fitbit_token}"}
    user_metrics = {
        "username": None,
        "sleep_hours": None,
        "calories_burned": None,
        "sleep_efficiency": None, "steps": None, "distance": None,
        "active_minutes": None, "protein": None, "carbs": None, "fat": None,
        "water_ml": None, "weight": None, "resting_hr": None, "hr_zones": None
    }

    try:
        async with httpx.AsyncClient() as client:
            today = datetime.date.today()

            # --- Sleep ---
            try:
                resp = await client.get(f"https://api.fitbit.com/1.2/user/-/sleep/date/{today}.json", headers=headers)
                logging.info(f"[Fitbit][Sleep] Status: {resp.status_code}, Response: {resp.text}")
                if resp.status_code == 200:
                    data = resp.json()
                    total_minutes = sum(s.get("minutesAsleep", s.get("duration",0)/60000) for s in data.get("sleep", []))
                    user_metrics["sleep_hours"] = total_minutes / 60 if total_minutes > 0 else None
                    user_metrics["sleep_efficiency"] = data["sleep"][0].get("efficiency") if data.get("sleep") else None
            except Exception as e:
                logging.warning(f"[Fitbit][Sleep] Exception: {e}")

            # --- Profile ---
            try:
                resp = await client.get("https://api.fitbit.com/1/user/-/profile.json", headers=headers, timeout=10)
                logging.info(f"[Fitbit][Profile] Status: {resp.status_code}, Response: {resp.text}")
                if resp.status_code == 200:
                    prof = resp.json().get("user", {})
                    user_metrics["username"] = prof.get("displayName")
                    user_metrics["weight"] = float(prof.get("weight",0)) if prof.get("weight") else None
            except Exception as e:
                logging.warning(f"[Fitbit][Profile] Exception: {e}")

            # --- Activity ---
            try:
                resp = await client.get(f"https://api.fitbit.com/1/user/-/activities/date/{today}.json", headers=headers, timeout=10)
                logging.info(f"[Fitbit][Activity] Status: {resp.status_code}, Response: {resp.text}")
                if resp.status_code == 200:
                    summary = resp.json().get("summary", {})
                    user_metrics["calories_burned"] = int(summary.get("caloriesOut",0))
                    user_metrics["steps"] = int(summary.get("steps",0))
                    distances = summary.get("distances", [])
                    if distances:
                        user_metrics["distance"] = float(next((d.get("distance") for d in distances if d.get("activity")=="total"), 0))
                    user_metrics["active_minutes"] = int(summary.get("fairlyActiveMinutes",0)) + int(summary.get("veryActiveMinutes",0))
            except Exception as e:
                logging.warning(f"[Fitbit][Activity] Exception: {e}")

            # --- Heart, Food, Water ---
            endpoints = {
                "heart": f"https://api.fitbit.com/1/user/-/activities/heart/date/{today}/1d.json",
                "food": f"https://api.fitbit.com/1/user/-/foods/log/date/{today}.json",
                "water": f"https://api.fitbit.com/1/user/-/foods/log/water/date/{today}.json"
            }
            for key, url in endpoints.items():
                try:
                    resp = await client.get(url, headers=headers, timeout=10)
                    logging.info(f"[Fitbit][{key.capitalize()}] Status: {resp.status_code}, Response: {resp.text}")
                except Exception as e:
                    logging.warning(f"[Fitbit][{key.capitalize()}] Exception: {e}")

    except Exception as e:
        logging.warning(f"[Fitbit] Overall fetch failed: {e}")

    logging.info(f"[RecoveryAgent] Final metrics: {user_metrics}")
    return user_metrics


async def recovery_node(state: Dict, context: Dict, trainer_node=None, nutrition_node=None) -> Dict:
    """
    Main recovery agent function handling Fitbit and manual flows separately.
    """
    token = context.get("token")
    caller = context.get("caller", "User")
    user_query = state.get("user_query")
    chat_history = state.get("chat_history", [])
    fitbit_token = state.get("fitbit_token")
    logging.info(f"[RecoveryAgent] Invoked by: {caller}")

    if not token:
        state["recovery_response"] = "Missing token"
        return state

    try:
        await verify_descope_token(token, RECOVERY_COLLECT)
    except Exception as e:
        state["recovery_response"] = f"Unauthorized: {str(e)}"
        return state

    defaults = {"sleep_hours":7, "protein":50, "mood":7, "diet_quality":7, "weight":70}

    # --- Fetch Fitbit if linked ---
    fitbit_data = {}
    fitbit_linked = state.get("fitbit_linked", False)
    if fitbit_token and fitbit_linked:
        fitbit_data = await fetch_fitbit_data(fitbit_token)
        for key, val in fitbit_data.items():
            if val is not None:
                state[f"fitbit_{key}"] = val

    # --- Determine manual vs Fitbit flow ---
    manual_metrics_present = any(state.get(k) is not None for k in ["manual_sleep_hours","manual_protein_grams","manual_calories_burned"])
    is_manual_flow = manual_metrics_present or not (fitbit_token and fitbit_linked)

    username = state.get("fitbit_username") or "User"
    sleep_hours = state.get("manual_sleep_hours") or state.get("fitbit_sleep_hours") or defaults["sleep_hours"]
    calories_burned = state.get("manual_calories_burned") or state.get("fitbit_calories_burned") or 500

    if not is_manual_flow:
        # --- Fitbit summary for judges ---
        fitbit_summary = {k: fitbit_data.get(k) for k in ["username","sleep_hours","calories_burned"]}
        if all(v is not None for v in fitbit_summary.values()):
            summary_text = (
                f"Fitbit data received. Metrics used for recovery suggestions:\n"
                f"- Username: {fitbit_summary['username']}\n"
                f"- Sleep Hours: {fitbit_summary['sleep_hours']:.1f}\n"
                f"- Calories Burned: {fitbit_summary['calories_burned']}\n"
                "Note: Only these three metrics are used for generating recovery advice."
            )
            state.setdefault("chat_history", []).append({"role":"system","content":summary_text})

    # --- Construct combined query ---
    combined_query = "\n".join(sanitize_text(m.get("text","")) for m in chat_history)
    if user_query:
        combined_query += f"\nUser: {sanitize_text(user_query)}"

    is_recovery_query = any(k in combined_query.lower() for k in ["recovery","sleep","rest","fatigue","recover","tired"])
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, openai_api_key=OPENAI_API_KEY)

    if is_recovery_query:
        if not is_manual_flow:
            # --- Fitbit flow ---
            prompt_text = (
                f"User Query: {combined_query}\n"
                f"Fitbit Username: {username}\n"
                f"Sleep Hours: {sleep_hours}\n"
                f"Calories Burned: {calories_burned}\n"
                "Provide actionable recovery advice based ONLY on these three metrics. "
                "Explicitly mention the Fitbit username in your response so it is visible to the judges. "
                "State clearly that only these three metrics were used."
            )
        else:
            # --- Manual flow ---
            manual_protein = state.get("manual_protein_grams") or defaults["protein"]
            manual_mood = state.get("mood") or defaults["mood"]
            manual_weight = state.get("weight") or defaults["weight"]

            # --- Invoke trainer and nutrition nodes if available ---
            trainer_invoked = nutrition_invoked = False
            if trainer_node and "trainer_response" not in state:
                try:
                    await verify_descope_token(token, RECOVERY_INVOKE_TRAINER)
                    state["invocation_log"] = state.get("invocation_log", []) + ["Recovery->Trainer"]
                    state = await trainer_node(state, {"token": token, "caller": "recovery"})
                    trainer_invoked = True
                except Exception as e:
                    state["trainer_response"] = f"Unauthorized: {str(e)}"
            if nutrition_node and "nutrition_response" not in state:
                try:
                    await verify_descope_token(token, RECOVERY_INVOKE_NUTRITION)
                    state["invocation_log"] = state.get("invocation_log", []) + ["Recovery->Nutrition"]
                    state = await nutrition_node(state, {"token": token, "caller": "recovery"})
                    nutrition_invoked = True
                except Exception as e:
                    state["nutrition_response"] = f"Unauthorized: {str(e)}"

            prompt_text = (
                f"User Query: {combined_query}\n"
                f"Sleep Hours: {sleep_hours}\n"
                f"Calories Burned: {calories_burned}\n"
                f"Protein Intake: {manual_protein}g\n"
                f"Mood Level: {manual_mood}/10\n"
                f"Weight: {manual_weight}kg\n"
                f"Trainer Advice: {state.get('trainer_response','N/A')}\n"
                f"Nutrition Advice: {state.get('nutrition_response','N/A')}\n"
                "Provide comprehensive recovery advice including sleep, activity, nutrition, hydration, and any trainer/nutrition suggestions. "
                "Avoid emojis, symbols, or asterisks."
            )

        messages = chat_prompt.format_prompt(user_query=prompt_text).to_messages()
        response = await llm.ainvoke(messages)
        state["recovery_response"] = response.content
        return state

    # --- Fallback LLM response if not a recovery query ---
    prompt = (
        f"User Query: {combined_query}\n"
        f"Sleep Hours: {sleep_hours}\n"
        f"Calories Burned: {calories_burned}\n"
        f"Trainer Advice: {state.get('trainer_response','N/A') if 'trainer_response' in state else 'N/A'}\n"
        f"Nutrition Advice: {state.get('nutrition_response','N/A') if 'nutrition_response' in state else 'N/A'}\n"
        "Provide comprehensive recovery analysis including training and diet suggestions if available, "
        "without emojis or symbols."
    )
    messages = chat_prompt.format_prompt(user_query=prompt).to_messages()
    response = await llm.ainvoke(messages)
    state["recovery_response"] = response.content

    return state
