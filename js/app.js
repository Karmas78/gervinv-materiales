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

        // Inventory
        document.getElementById('btn-new-product').addEventListener('click', () => {
            document.getElementById('product-form').reset();
            document.getElementById('prod-id').value = '';
            document.getElementById('modal-title').innerText = 'Registrar Producto';
            ui.openModal('product-modal');
        });

        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                id: document.getElementById('prod-id').value,
                nombre: document.getElementById('prod-name').value,
                categoria: document.getElementById('prod-category').value,
                stock_minimo: parseInt(document.getElementById('prod-min-stock').value),
                descripcion: document.getElementById('prod-desc').value
            };
            await products.save(formData);
        });

        // Delivery
        document.getElementById('add-to-list').addEventListener('click', () => delivery.addItem());
        document.getElementById('delivery-form').addEventListener('submit', (e) => {
            e.preventDefault();
            delivery.process();
        });
        
        // Staff
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

        // Loans
        document.getElementById('btn-new-loan').addEventListener('click', () => {
            document.getElementById('loan-form').reset();
            loans.fillSelectors();
            ui.openModal('loan-modal');
        });

        document.getElementById('loan-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const prodSelect = document.getElementById('loan-product');
            const staffSelect = document.getElementById('loan-staff');
            
            const formData = {
                producto_id: prodSelect.value,
                producto_nombre: prodSelect.options[prodSelect.selectedIndex].text.split(' (')[0],
                funcionario_id: staffSelect.value,
                funcionario_nombre: staffSelect.options[staffSelect.selectedIndex].text,
                fecha_devolucion_prevista: document.getElementById('loan-return-date').value,
                observaciones: document.getElementById('loan-obs').value
            };
            await loans.create(formData);
        });

        // Theme Toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            const icon = document.querySelector('#theme-toggle i');
            icon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        });
    },

    renderHistory() {
        const moves = db.getMovimientos();
        const tbody = document.getElementById('history-table');
        if (!tbody) return;

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
