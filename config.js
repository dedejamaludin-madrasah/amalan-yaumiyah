// GANTI DENGAN KUNCI SUPABASE ANDA
const SUPABASE_URL = 'https://iinprkhxulmpioqakdte.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbnBya2h4dWxtcGlvcWFrZHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTkyNzAsImV4cCI6MjA4MjIzNTI3MH0.nVXeKEE5kiWV_Uvmd-H-5pTk48MLm981Njdmujtsq28';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi untuk menyimpan user yang sedang login di browser (LocalStorage)
function saveSession(user) {
    localStorage.setItem('amalan_user', JSON.stringify(user));
}

function getSession() {
    const user = localStorage.getItem('amalan_user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('amalan_user');
    window.location.href = 'index.html';
}

// Format tanggal Indonesia
function getIndoDate() {
    const d = new Date();
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

}
