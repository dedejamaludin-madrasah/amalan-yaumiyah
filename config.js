// GANTI DENGAN KUNCI SUPABASE ANDA
const SUPABASE_URL = 'https://URL_PROJECT_ANDA.supabase.co';
const SUPABASE_KEY = 'KEY_ANON_PANJANG_ANDA';

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