/**
 * App Main Entry Point - Firebase Orchestrator
 */
import { db } from './db.js';
import { ui } from './modules/ui.js';
import { auth } from './modules/auth.js';
import { products } from './modules/products.js';
import { delivery } from './modules/delivery.js';
import { staff } from './modules/staff.js';
import { loans } from './modules/loans.js';

const app = {
    historySearchTerm: '',
    historyTypeFilter: '',

    async init() {
        console.log('GervInv initializing with Firebase...');
        
        // Listener de Autenticación
        auth.onAuthChange((user) => {
            this.handleAuthState(user);
        });

        this.bindEvents();
    },

    async handleAuthState(user) {
        const loginScreen = document.getElementById('login-screen');
        const appShell = document.getElementById('app-shell');

        if (user) {
            loginScreen.classList.remove('active');
            appShell.style.display = 'flex';
            document.getElementById('user-name').innerText = user.email.split('@')[0];
            document.getElementById('user-avatar').innerText = user.email[0].toUpperCase();
            
            // Inicializar base de datos con callback de actualización
            await db.init((collectionName) => {
                this.refreshUI(collectionName);
            });
            
            ui.showToast('Conectado a Firebase', 'success');
        } else {
            loginScreen.classList.add('active');
            appShell.style.display = 'none';
        }
    },

    refreshUI(collectionName) {
        console.log(`Real-time update: ${collectionName}`);
        if (collectionName === 'productos') {
            products.renderInventory();
            products.updateDashboard();
            delivery.renderProductSelect(); // Refresh available products in delivery
        }
        if (collectionName === 'movimientos') {
            this.renderHistory();
            products.updateDashboard(); // Updates "Deliveries Today"
        }
        if (collectionName === 'funcionarios') {
            staff.renderStaff();
            delivery.renderStaffSelect();
            loans.fillSelectors();
        }
        if (collectionName === 'prestamos') {
            loans.renderLoans();
        }
    },

    bindEvents() {
        // Auth
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            try {
                btn.disabled = true;
                btn.innerHTML = '<span>Verificando...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
                await auth.login(email, pass);
            } catch (error) {
                ui.showToast(error.message, 'danger');
                btn.disabled = false;
                btn.innerHTML = '<span>Iniciar Sesión</span> <i class="fa-solid fa-right-to-bracket"></i>';
            }
        });

        document.getElementById('logout-btn').addEventListener('click', () => auth.logout());

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = item.dataset.view;
                ui.toggleView(viewId);
                
                // Refresh data if needed
                if (viewId === 'history') this.renderHistory();
                if (viewId === 'staff') staff.renderStaff();
                if (viewId === 'loans') loans.renderLoans();
            });
        });

        // --- Mobile Sidebar ---
        document.getElementById('hamburger-btn').addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('sidebar-overlay').addEventListener('click', () => ui.closeSidebar());

        // --- Notifications ---
        document.getElementById('notif-btn').addEventListener('click', () => ui.toggleNotifPanel());
        document.getElementById('notif-close').addEventListener('click', () => ui.closeNotifPanel());

        // --- Inventory ---
        document.getElementById('btn-import-products').addEventListener('click', () => products.importFromSeed());
        document.getElementById('btn-export-inventory').addEventListener('click', () => ui.exportInventory());

        document.getElementById('btn-new-product').addEventListener('click', () => {
            document.getElementById('product-form').reset();
            document.getElementById('prod-id').value = '';
            document.getElementById('prod-initial-stock').disabled = false; // Permitir stock inicial en nuevo
            document.getElementById('modal-title').innerText = 'Registrar Producto';
            ui.openModal('product-modal');
        });

        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                id: document.getElementById('prod-id').value,
                nombre: document.getElementById('prod-name').value,
                marca: document.getElementById('prod-brand').value,
                categoria: document.getElementById('prod-category').value,
                stock_minimo: parseInt(document.getElementById('prod-min-stock').value),
                stock_actual: parseInt(document.getElementById('prod-initial-stock').value) || 0,
                descripcion: document.getElementById('prod-desc').value,
                orden_compra: document.getElementById('prod-oc').value,
                fecha_recepcion: document.getElementById('prod-receipt-date').value
            };
            await products.save(formData);
        });

        // --- Inventory Search/Filter ---
        document.getElementById('inventory-search').addEventListener('input', (e) => {
            products.searchTerm = e.target.value;
            products.renderInventory();
        });
        document.getElementById('inventory-category-filter').addEventListener('change', (e) => {
            products.categoryFilter = e.target.value;
            products.renderInventory();
        });

        // --- Delivery ---
        document.getElementById('add-to-list').addEventListener('click', () => delivery.addItem());
        document.getElementById('delivery-form').addEventListener('submit', (e) => {
            e.preventDefault();
            delivery.process();
        });
        
        // --- Staff ---
        document.getElementById('btn-import-staff').addEventListener('click', () => staff.importFromSeed());

        document.getElementById('btn-new-staff').addEventListener('click', () => {
            document.getElementById('staff-form').reset();
            document.getElementById('staff-id').value = '';
            document.getElementById('staff-modal-title').innerText = 'Registrar Funcionario';
            ui.openModal('staff-modal');
        });

        document.getElementById('staff-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                id: document.getElementById('staff-id').value,
                nombre: document.getElementById('staff-name').value,
                rut: document.getElementById('staff-rut').value,
                departamento: document.getElementById('staff-dept').value
            };
            await staff.save(formData);
        });

        // Staff Search
        document.getElementById('staff-search').addEventListener('input', (e) => {
            staff.searchTerm = e.target.value;
            staff.renderStaff();
        });

        // --- Loans ---
        document.getElementById('btn-new-loan').addEventListener('click', () => {
            document.getElementById('loan-form').reset();
            loans.tempList = [];
            loans.renderTempList();
            loans.fillSelectors();
            ui.openModal('loan-modal');
        });

        document.getElementById('add-to-loan-list').addEventListener('click', () => loans.addItem());

        document.getElementById('loan-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await loans.process();
        });

        // Loans Search/Filter
        document.getElementById('loans-search').addEventListener('input', (e) => {
            loans.searchTerm = e.target.value;
            loans.renderLoans();
        });
        document.getElementById('loans-status-filter').addEventListener('change', (e) => {
            loans.statusFilter = e.target.value;
            loans.renderLoans();
        });

        // --- Loans Export ---
        document.getElementById('btn-export-loans').addEventListener('click', () => ui.exportLoans());

        // --- History Search/Filter ---
        document.getElementById('history-search').addEventListener('input', (e) => {
            this.historySearchTerm = e.target.value;
            this.renderHistory();
        });
        document.getElementById('history-type-filter').addEventListener('change', (e) => {
            this.historyTypeFilter = e.target.value;
            this.renderHistory();
        });

        // --- History Export ---
        document.getElementById('btn-export-history').addEventListener('click', () => ui.exportHistory());

        // Theme Toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('gervinv-theme', newTheme);
            const icon = document.querySelector('#theme-toggle i');
            icon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        });

        // Restore saved theme
        const savedTheme = localStorage.getItem('gervinv-theme');
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            const icon = document.querySelector('#theme-toggle i');
            if (icon) icon.className = 'fa-solid fa-sun';
        }
    },

    renderHistory() {
        let moves = db.getMovimientos();
        const tbody = document.getElementById('history-table');
        if (!tbody) return;

        // Apply search filter
        if (this.historySearchTerm) {
            const term = this.historySearchTerm.toLowerCase();
            moves = moves.filter(m => {
                const product = db.getProductos().find(p => p.id === m.producto_id);
                const prodName = product ? product.nombre.toLowerCase() : '';
                return prodName.includes(term) ||
                    (m.responsable || '').toLowerCase().includes(term) ||
                    (m.referencia || '').toLowerCase().includes(term);
            });
        }

        // Apply type filter
        if (this.historyTypeFilter) {
            moves = moves.filter(m => m.tipo === this.historyTypeFilter);
        }

        if (moves.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 40px;">No se encontraron movimientos</td></tr>`;
            return;
        }

        tbody.innerHTML = moves.map(m => {
            const product = db.getProductos().find(p => p.id === m.producto_id);
            return `
                <tr>
                    <td>${ui.formatDate(m.fecha)}</td>
                    <td><span class="badge ${m.tipo === 'ENTRADA' ? 'badge-success' : 'badge-warning'}">${m.tipo}</span></td>
                    <td><strong>${product ? product.nombre : 'Material'}</strong></td>
                    <td><strong>${m.cantidad}</strong></td>
                    <td>${m.responsable}</td>
                    <td><small>${m.referencia || '-'}</small></td>
                </tr>
            `;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
