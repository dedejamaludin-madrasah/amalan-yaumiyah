// GANTI DENGAN KUNCI ANDA DARI DASHBOARD SUPABASE
const SUPABASE_URL = 'https://iinprkhxulmpioqakdte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbnBya2h4dWxtcGlvcWFrZHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTkyNzAsImV4cCI6MjA4MjIzNTI3MH0.nVXeKEE5kiWV_Uvmd-H-5pTk48MLm981Njdmujtsq28'; // Masukkan Anon Key yang panjang

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi cek login (dipakai di setiap halaman)
async function checkSession() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    }
    return session.user;
}