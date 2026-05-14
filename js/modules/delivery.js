/**
 * Delivery Module - Outgoing Materials
 */
import { db } from '../db.js';
import { ui } from './ui.js';
import { products } from './products.js';

export const delivery = {
    tempList: [],

    init() {
        this.renderStaffSelect();
        this.renderProductSelect();
        this.renderDeliveries();
    },

    renderDeliveries() {
        let moves = db.getMovimientos().filter(m => m.tipo === 'SALIDA');
        const tbody = document.getElementById('deliveries-table-body');
        if (!tbody) return;

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            moves = moves.filter(m => 
                (m.responsable || '').toLowerCase().includes(term) ||
                (m.referencia || '').toLowerCase().includes(term)
            );
        }

        if (moves.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 40px;">No hay entregas registradas</td></tr>`;
            return;
        }

        // Group by Date, Responsable, Referencia
        const grouped = {};
        moves.forEach(m => {
            const key = `${m.fecha}-${m.responsable}-${m.referencia}`;
            if (!grouped[key]) {
                grouped[key] = {
                    fecha: m.fecha,
                    responsable: m.responsable,
                    referencia: m.referencia,
                    items: []
                };
            }
            const product = db.getProductos().find(p => p.id === m.producto_id);
            const pName = product ? product.nombre : 'Material eliminado';
            grouped[key].items.push(`${pName} (${m.cantidad})`);
        });

        tbody.innerHTML = Object.values(grouped).sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(g => `
            <tr>
                <td>${ui.formatDate(g.fecha)}</td>
                <td>${g.responsable}</td>
                <td>${g.items.join('<br>')}</td>
                <td><small>${g.referencia || '-'}</small></td>
            </tr>
        `).join('');
    },

    renderStaffSelect() {
        const staff = db.getFuncionarios();
        const select = document.getElementById('delivery-staff');
        select.innerHTML = '<option value="">Seleccione un funcionario...</option>' + 
            staff.map(s => `<option value="${s.id}">${s.nombre} (${s.departamento})</option>`).join('');
    },

    renderProductSelect() {
        const prods = db.getProductos();
        const select = document.getElementById('product-select');
        select.innerHTML = '<option value="">Elegir material...</option>' + 
            prods.map(p => `<option value="${p.id}">${p.nombre} ${p.marca ? `(${p.marca})` : ''} (S: ${p.stock_actual})</option>`).join('');
    },

    addItem() {
        const prodId = document.getElementById('product-select').value;
        const qty = parseInt(document.getElementById('product-qty').value);
        
        if (!prodId || isNaN(qty) || qty <= 0) {
            ui.showToast('Seleccione un material y cantidad válida', 'warning');
            return;
        }

        const product = db.getProductos().find(p => p.id === prodId);
        if (qty > product.stock_actual) {
            ui.showToast('Stock insuficiente', 'danger');
            return;
        }

        const fullName = `${product.nombre} ${product.marca ? `(${product.marca})` : ''}`;
        this.tempList.push({ id: prodId, nombre: fullName, qty });
        this.renderTempList();
        
        // Reset inputs
        document.getElementById('product-select').value = '';
        document.getElementById('product-qty').value = '';
    },

    renderTempList() {
        const tbody = document.getElementById('delivery-list');
        tbody.innerHTML = this.tempList.map((item, idx) => `
            <tr>
                <td>${item.nombre}</td>
                <td><strong>${item.qty}</strong></td>
                <td><button type="button" class="btn-icon" onclick="delivery.removeItem(${idx})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    },

    removeItem(idx) {
        this.tempList.splice(idx, 1);
        this.renderTempList();
    },

    async process() {
        const staffId = document.getElementById('delivery-staff').value;
        const reference = document.getElementById('delivery-ref').value;

        if (!staffId || this.tempList.length === 0) {
            ui.showToast('Complete los datos de la entrega', 'warning');
            return;
        }

        try {
            const staff = db.getFuncionarios().find(s => s.id === staffId);
            
            for (const item of this.tempList) {
                await db.registrarMovimiento({
                    tipo: 'SALIDA',
                    producto_id: item.id,
                    cantidad: item.qty,
                    responsable: staff.nombre,
                    referencia: reference
                });
            }

            ui.showToast('Entrega procesada con éxito', 'success');
            ui.closeModals();
            this.tempList = [];
            this.renderTempList();
            document.getElementById('delivery-form').reset();
            
            // Refresh other modules
            this.renderProductSelect();
            this.renderDeliveries();
            products.renderInventory();
            products.updateDashboard();
        } catch (error) {
            ui.showToast(error.message, 'danger');
        }
    }
};

window.delivery = delivery;
