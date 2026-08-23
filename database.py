import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("https://xdxyjcuqtajwdiunmahy.supabase.co")
SUPABASE_KEY = os.getenv("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeHlqY3VxdGFqd2RpdW5tYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjY5NDcsImV4cCI6MjEwMjQ0Mjk0N30.Jh1Lh_--kiCxAbF1iq86FMnVpm_G7inTzxgzH7bwrLI")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key must be set in environment variables!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)