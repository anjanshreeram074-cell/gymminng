// ============================================
// Gym Management System - Shared JavaScript
// ============================================

// --- Auth Guard ---
function checkAuth() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    // Skip auth for login page
    if (currentPage === 'login.html') return;

    const userStr = localStorage.getItem('gym_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        localStorage.removeItem('gym_user');
        window.location.href = 'login.html';
        return;
    }

    const role = user.role || 'staff';
    const adminPages = ['index.html', 'manage-staff.html', 'expenditure.html', 'admin-reports.html'];

    if (role === 'staff') {
        if (adminPages.includes(currentPage) || currentPage === 'trainer-dashboard.html') {
            window.location.href = 'staff-dashboard.html';
        }
    } else if (role === 'admin') {
        if (currentPage === 'trainer-dashboard.html') {
            window.location.href = 'index.html';
        }
    }
}

function logout() {
    localStorage.removeItem('gym_user');
    window.location.href = 'login.html';
}

function getLoggedInUser() {
    try {
        return JSON.parse(localStorage.getItem('gym_user'));
    } catch {
        return null;
    }
}

// Run auth check immediately
checkAuth();

const API_BASE = window.location.origin + '/api';

// --- Fetch Helpers ---
async function apiGet(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.statusText}`);
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiPut(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiDelete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    return res.json();
}

// --- Toast Notifications ---
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Active Nav Link Highlighting ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Highlight active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) link.classList.add('active');
    });

    // Update welcome text with user name
    const user = getLoggedInUser();
    if (user) {
        const pageHeader = document.querySelector('.page-header p');
        if (pageHeader && currentPage === 'index.html') {
            pageHeader.textContent = `Welcome back, ${user.name}! Here's an overview of your gym.`;
        }
    }
});

// --- Utility Functions ---
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
}

function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

function getMembershipBadge(type) {
    const cls = {
        'Monthly': 'badge-monthly',
        'Quarterly': 'badge-quarterly',
        'Half-Yearly': 'badge-half',
        'Yearly': 'badge-yearly'
    }[type] || 'badge-method';
    return `<span class="badge ${cls}">${type}</span>`;
}

function getMethodBadge(method) {
    return `<span class="badge badge-method">${method}</span>`;
}

function confirmDelete(name) {
    return confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
}
