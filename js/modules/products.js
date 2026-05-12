/**
 * Products Module - Inventory Management
 */
import { db } from '../db.js';
import { ui } from './ui.js';

export const products = {
    renderInventory() {
        const list = db.getProductos();
        const tbody = document.getElementById('inventory-table');
        tbody.innerHTML = list.map(p => `
            <tr>
                <td>
                    <strong>${p.nombre}</strong>
                    <br><small class="text-muted">${p.descripcion || ''}</small>
                </td>
                <td>${p.categoria}</td>
                <td>
                    <span class="badge ${p.stock_actual <= p.stock_minimo ? 'badge-warning' : 'badge-success'}">
                        ${p.stock_actual}
                    </span>
                </td>
                <td>${p.stock_minimo}</td>
                <td>
                    <button class="btn-icon" onclick="products.edit('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async save(formData) {
        try {
            await db.saveProducto(formData);
            ui.showToast('Producto guardado correctamente', 'success');
            ui.closeModals();
            this.renderInventory();
            this.updateDashboard();
        } catch (error) {
            ui.showToast(error.message, 'danger');
        }
    },

    edit(id) {
        const p = db.getProductos().find(prod => prod.id === id);
        if (!p) return;
        
        document.getElementById('modal-title').innerText = 'Editar Producto';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.nombre;
        document.getElementById('prod-category').value = p.categoria;
        document.getElementById('prod-min-stock').value = p.stock_minimo;
        document.getElementById('prod-desc').value = p.descripcion || '';
        
        ui.openModal('product-modal');
    },

    updateDashboard() {
        const list = db.getProductos();
        const critical = list.filter(p => p.stock_actual <= p.stock_minimo);
        
        document.getElementById('stat-total-products').innerText = list.length;
        document.getElementById('stat-critical-stock').innerText = critical.length;
        
        const criticalTable = document.getElementById('critical-stock-table');
        criticalTable.innerHTML = critical.map(p => `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria}</td>
                <td><span class="badge-warning badge">${p.stock_actual}</span></td>
                <td>${p.stock_minimo}</td>
                <td style="color: var(--danger); font-weight: 600;">REABASTECER</td>
            </tr>
        `).join('');
    }
};

window.products = products;
