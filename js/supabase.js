const SUPABASE_URL = "https://qxokdijbrqokxhxppcen.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b2tkaWpicnFva3hoeHBwY2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTIxODYsImV4cCI6MjA4NzY2ODE4Nn0.z29brJvBT0nIlP5tSYO14_s11VK1Nk1buXd33TqOvLM";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
