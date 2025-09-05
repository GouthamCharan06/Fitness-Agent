

# User
USER_QUERY = "user.query" # Question from user or input prompt from user
USER_READ_RESPONSE = "user.read_response" # Response from agents or output for the user's prompt

# Orchestrator
ORCHESTRATOR_ROUTE = "orchestrator.route" # Classifies intent and routes it to respective agents based on prompt
ORCHESTRATOR_COMBINE = "orchestrator.combine" # Combines responses from agents and returns it to user

# Trainer
TRAINER_READ = "trainer.read" # Reads user prompt if orchestrator routes it to trainer
TRAINER_SUGGEST = "trainer.suggest" # Generates response for user prompt
TRAINER_INVOKE_NUTRITION = "trainer.invoke_nutrition" # Incase of a mixed query, it invokes nutrition

# Nutrition
NUTRITION_INVOKE_TRAINER = "nutrition.invoke_trainer" # Incase of a mixed query, invokes trainer
NUTRITION_DIETPLAN = "nutrition.dietplan" # Generates response for user (main functionality)
NUTRITION_BREAKDOWN = "nutrition.breakdown" # Generates nutritional values for food items

# Recovery
RECOVERY_COLLECT = "recovery.collect" # Collects responses from trainer and nutrition agents
RECOVERY_INVOKE_TRAINER = "recovery.invoke_trainer" # Invokes trainer
RECOVERY_INVOKE_NUTRITION = "recovery.invoke_nutrition" # Invokes nutrition
RECOVERY_READ = "recovery.read" # Reads user prompt given by orchestrator
