# backend/agents/recovery_agent.py
import os
import logging
from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
)
from backend.scopes import RECOVERY_COLLECT, RECOVERY_INVOKE_TRAINER, RECOVERY_INVOKE_NUTRITION
from backend.auth import verify_descope_token
import re
import httpx
import datetime
from typing import Dict, Any

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

logging.basicConfig(level=logging.INFO)

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
    headers = {"Authorization": f"Bearer {fitbit_token}"}
    user_metrics = {}
    missing_metrics = []
    try:
        async with httpx.AsyncClient() as client:
            today = datetime.date.today()
            dates_to_check = [today, today - datetime.timedelta(days=1)]

            # Initialize metrics
            for k in [
                "sleep_hours", "sleep_efficiency", "username", "age", "weight",
                "height", "steps", "calories_burned", "distance", "active_minutes",
                "resting_hr", "hr_zones", "calories_consumed", "protein", "carbs",
                "fat", "water_ml"
            ]:
                user_metrics[k] = None

            data_found = False

            for date in dates_to_check:
                str_date = date.strftime("%Y-%m-%d")

                # Sleep
                try:
                    resp = await client.get(
                        f"https://api.fitbit.com/1.2/user/-/sleep/date/{str_date}.json",
                        headers=headers,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        total_minutes = sum(
                            s.get("minutesAsleep", s.get("duration", 0)/60000)
                            for s in data.get("sleep", [])
                        )
                        if total_minutes > 0:
                            user_metrics["sleep_hours"] = total_minutes / 60
                            user_metrics["sleep_efficiency"] = data["sleep"][0].get("efficiency")
                            data_found = True
                            break
                except Exception as e:
                    logging.warning(f"[Fitbit][Sleep] {e}")

            # Profile
            try:
                resp = await client.get(
                    "https://api.fitbit.com/1/user/-/profile.json",
                    headers=headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    prof = resp.json().get("user", {})
                    user_metrics["username"] = prof.get("displayName")
                    user_metrics["age"] = int(prof.get("age", 0)) if prof.get("age") else None
                    user_metrics["weight"] = float(prof.get("weight", 0)) if prof.get("weight") else None
                    user_metrics["height"] = float(prof.get("height", 0)) if prof.get("height") else None
                    data_found = True
            except Exception as e:
                logging.warning(f"[Fitbit][Profile] {e}")

            # Activity
            try:
                resp = await client.get(
                    f"https://api.fitbit.com/1/user/-/activities/date/{today.strftime('%Y-%m-%d')}.json",
                    headers=headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    summary = resp.json().get("summary", {})
                    user_metrics["steps"] = int(summary.get("steps", 0))
                    user_metrics["calories_burned"] = int(summary.get("caloriesOut", 0))
                    distances = summary.get("distances", [])
                    if distances:
                        user_metrics["distance"] = float(next(
                            (d.get("distance") for d in distances if d.get("activity") == "total"),
                            distances[0].get("distance", 0)
                        ))
                    user_metrics["active_minutes"] = int(summary.get("fairlyActiveMinutes", 0)) + int(summary.get("veryActiveMinutes", 0))
                    data_found = True
            except Exception as e:
                logging.warning(f"[Fitbit][Activity] {e}")

            # Heart Rate
            try:
                resp = await client.get(
                    f"https://api.fitbit.com/1/user/-/activities/heart/date/{today.strftime('%Y-%m-%d')}/1d.json",
                    headers=headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    activities = resp.json().get("activities-heart", [])
                    if activities:
                        value = activities[0].get("value", {})
                        user_metrics["resting_hr"] = int(value.get("restingHeartRate")) if value.get("restingHeartRate") else None
                        user_metrics["hr_zones"] = value.get("heartRateZones")
                        data_found = True
            except Exception as e:
                logging.warning(f"[Fitbit][Heart] {e}")

            # Food
            try:
                resp = await client.get(
                    f"https://api.fitbit.com/1/user/-/foods/log/date/{today.strftime('%Y-%m-%d')}.json",
                    headers=headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    summary = resp.json().get("summary", {})
                    user_metrics["calories_consumed"] = int(summary.get("calories", 0))
                    nutrients = summary.get("nutrients", {})
                    user_metrics["protein"] = float(summary.get("protein", nutrients.get("protein", 0.0)))
                    user_metrics["carbs"] = float(summary.get("carbohydrates", nutrients.get("carbohydrates", 0.0)))
                    user_metrics["fat"] = float(summary.get("fat", nutrients.get("fat", 0.0)))
                    data_found = True
            except Exception as e:
                logging.warning(f"[Fitbit][Food] {e}")

            # Hydration
            try:
                resp = await client.get(
                    f"https://api.fitbit.com/1/user/-/foods/log/water/date/{today.strftime('%Y-%m-%d')}.json",
                    headers=headers,
                    timeout=10,
                )
                if resp.status_code == 200:
                    water = resp.json().get("summary", {}).get("water")
                    if water is not None:
                        val = float(water)
                        user_metrics["water_ml"] = int(val * 1000) if val < 20 else int(val)
                        data_found = True
            except Exception as e:
                logging.warning(f"[Fitbit][Water] {e}")

            if not data_found:
                logging.info(
                    f"No Fitbit data found for metrics: {', '.join([k for k,v in user_metrics.items() if v is None])} on {today}. "
                    "Please try again after sometime or make sure that data is logged in app."
                )

    except Exception as e:
        logging.warning(f"[Fitbit] Overall fetch failed: {e}")

    return user_metrics


async def recovery_node(state: Dict, context: Dict, trainer_node=None, nutrition_node=None) -> Dict:
    token = context.get("token")
    caller = context.get("caller", "User")
    user_query = state.get("user_query")
    chat_history = state.get("chat_history", [])
    fitbit_token = state.get("fitbit_token")
    logging.info(f"[RecoveryAgent] Invoked by: {caller}")

    if not token:
        state["recovery_response"] = "⛔ Missing token"
        return state

    try:
        await verify_descope_token(token, RECOVERY_COLLECT)
    except Exception as e:
        state["recovery_response"] = f"⛔ Unauthorized: {str(e)}"
        return state

    # Defaults
    default_sleep = 7
    default_protein = 50
    default_mood = 7
    default_diet = 7
    default_weight = 70

    # Fetch Fitbit data if token present
    fitbit_data = {}
    if fitbit_token:
        fitbit_data = await fetch_fitbit_data(fitbit_token)

    # Map Fitbit data into state without overwriting
    for key in [
        "username","age","weight","height","steps","calories_burned","distance",
        "active_minutes","resting_hr","hr_zones","sleep_hours","sleep_efficiency",
        "calories_consumed","protein","carbs","fat","water_ml"
    ]:
        state.setdefault(f"fitbit_{key}", fitbit_data.get(key))

    # Helper to safely pick first available value
    def safe_value(*values, default):
        for v in values:
            if v is not None:
                return v
        return default

    # Determine effective metrics
    sleep_hours = safe_value(
        state.get("manual_sleep_hours"),
        state.get("sleep_hours"),
        state.get("fitbit_sleep_hours"),
        default=default_sleep
    )
    protein = safe_value(
        state.get("manual_protein_grams"),
        state.get("protein"),
        state.get("fitbit_protein"),
        default=default_protein
    )
    mood = safe_value(state.get("mood"), default=default_mood)
    diet_quality = safe_value(state.get("diet_quality"), default=default_diet)
    weight = safe_value(state.get("weight"), state.get("fitbit_weight"), default=default_weight)

    # Combine sanitized chat history
    if chat_history:
        sanitized = [sanitize_text(m.get("text", "")) for m in chat_history]
        combined_query = "\n".join(f"User: {s}" for s in sanitized)
        combined_query += f"\nUser: {sanitize_text(user_query)}"
    else:
        combined_query = sanitize_text(user_query or "")

    is_recovery_query = any(
        k in combined_query.lower()
        for k in ["recovery", "sleep", "rest", "fatigue", "recover", "tired"]
    )

    # Recovery logic
    if is_recovery_query:
        missing = []
        if sleep_hours is None:
            missing.append("sleep hours")
        if protein is None:
            missing.append("protein intake")
        if mood is None:
            missing.append("current mood (0-10)")

        if missing:
            state["recovery_response"] = (
                f"Please provide: {', '.join(missing)} for accurate assessment, or skip to use defaults."
            )
            return state

        # Clamp inputs
        sleep_hours = max(0, min(sleep_hours, 24))
        protein = max(0, min(protein, 300))
        mood = max(0, min(mood, 10))
        weight = max(30, min(weight, 200))

        recovery_percent = (
            (sleep_hours / 8) * 0.4
            + (protein / 100) * 0.3
            + (mood / 10) * 0.2
            + (weight / 100) * 0.1
        ) * 100
        recovery_percent = max(0, min(recovery_percent, 100))
        state["recovery_percent"] = recovery_percent

        prompt_text = (
            f"User Query: {combined_query}\n"
            f"Sleep Hours: {sleep_hours}\n"
            f"Protein Intake: {protein}g\n"
            f"Mood Level: {mood}/10\n"
            f"Weight: {weight}kg\n"
            f"Recovery Score: {recovery_percent:.1f}%\n"
            "Provide actionable recovery advice. Recommend rest or reduced workout intensity if recovery <70%. Otherwise, advise normal training. Use compassionate tone. No emojis or symbols."
        )

        llm = ChatOpenAI(
            model="gpt-4o-mini", temperature=0.7, openai_api_key=OPENAI_API_KEY
        )
        messages = chat_prompt.format_prompt(user_query=prompt_text).to_messages()
        response = await llm.ainvoke(messages)
        state["recovery_response"] = response.content

    else:
        # Non-recovery queries: delegate to trainer/nutrition if available
        sleep_hours = max(0, min(sleep_hours, 24))
        diet_quality = max(0, min(diet_quality, 10))
        mood = max(0, min(mood, 10))
        weight = max(30, min(weight, 200))

        recovery_percent = (
            (sleep_hours / 8) * 0.4
            + (diet_quality / 10) * 0.3
            + (mood / 10) * 0.2
            + (weight / 100) * 0.1
        ) * 100
        recovery_percent = max(0, min(recovery_percent, 100))
        state["recovery_percent"] = recovery_percent

        if trainer_node:
            try:
                await verify_descope_token(token, RECOVERY_INVOKE_TRAINER)
                logging.info("Delegating to TrainerAgent")
                state["invocation_log"] = state.get("invocation_log", []) + ["Recovery->Trainer"]
                state = await trainer_node(state, {"token": token, "caller": "recovery"})
            except Exception as e:
                state["trainer_response"] = f"⛔ Unauthorized: {str(e)}"

        if nutrition_node:
            try:
                await verify_descope_token(token, RECOVERY_INVOKE_NUTRITION)
                logging.info("Delegating to NutritionAgent")
                state["invocation_log"] = state.get("invocation_log", []) + ["Recovery->Nutrition"]
                state = await nutrition_node(state, {"token": token, "caller": "recovery"})
            except Exception as e:
                state["nutrition_response"] = f"⛔ Unauthorized: {str(e)}"

        prompt = (
            f"User Query: {combined_query}\n"
            f"Sleep Hours: {sleep_hours}\n"
            f"Diet Quality: {diet_quality}\n"
            f"Mood Level: {mood}\n"
            f"Weight: {weight}\n"
            f"Recovery Score: {recovery_percent:.1f}%\n"
            f"Trainer Advice: {state.get('trainer_response', 'None')}\n"
            f"Nutrition Advice: {state.get('nutrition_response', 'None')}\n"
            "Provide comprehensive recovery analysis without emojis or symbols."
        )
        llm = ChatOpenAI(
            model="gpt-4o-mini", temperature=0.7, openai_api_key=OPENAI_API_KEY
        )
        messages = chat_prompt.format_prompt(user_query=prompt).to_messages()
        response = await llm.ainvoke(messages)
        state["recovery_response"] = response.content

    return state
