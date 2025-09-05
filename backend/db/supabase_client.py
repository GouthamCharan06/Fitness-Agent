
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Loading environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Supabase URL or Service Role Key not set in .env file")

# Creating Supabase client with service role key
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_exercises(muscle_group: str = None, difficulty: str = None):
    """
    Fetch exercises filtered by muscle group and difficulty.
    If no filters, return all exercises.
    """
    query = supabase.from_("exercises").select("*")
    
    if muscle_group:
        query = query.eq("muscle_group", muscle_group)
    if difficulty:
        query = query.eq("difficulty", difficulty)
    
    response = query.execute()
    return response.data
