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
        select.innerHTML = '<option value="">Elegir producto...</option>' + 
            prods.map(p => `<option value="${p.id}">${p.nombre} (S: ${p.stock_actual})</option>`).join('');
    },

    addItem() {
        const prodId = document.getElementById('product-select').value;
        const qty = parseInt(document.getElementById('product-qty').value);
        
        if (!prodId || isNaN(qty) || qty <= 0) {
            ui.showToast('Seleccione un producto y cantidad válida', 'warning');
            return;
        }

        const product = db.getProductos().find(p => p.id === prodId);
        if (qty > product.stock_actual) {
            ui.showToast('Stock insuficiente', 'danger');
            return;
        }

        this.tempList.push({ id: prodId, nombre: product.nombre, qty });
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
            this.tempList = [];
            this.renderTempList();
            document.getElementById('delivery-form').reset();
            
            // Refresh other modules
            this.renderProductSelect();
            products.renderInventory();
            products.updateDashboard();
        } catch (error) {
            ui.showToast(error.message, 'danger');
        }
    }
};

window.delivery = delivery;
