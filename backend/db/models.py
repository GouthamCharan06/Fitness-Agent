from pydantic import BaseModel
from typing import Optional

class Exercise(BaseModel):
    id: int
    muscle_group: str
    gender: str
    exercise_name: str
    exercise_url: str
    difficulty: str
