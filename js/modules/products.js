/**
 * Products Module - Inventory Management
 */
import { db } from '../db.js';
import { ui } from './ui.js';
import { productSeed } from '../seed.js';

export const products = {
    searchTerm: '',
    categoryFilter: '',

    renderInventory() {
        let list = db.getProductos();

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            list = list.filter(p =>
                p.nombre.toLowerCase().includes(term) ||
                (p.marca || '').toLowerCase().includes(term) ||
                (p.descripcion || '').toLowerCase().includes(term)
            );
        }

        // Apply category filter
        if (this.categoryFilter) {
            list = list.filter(p => p.categoria === this.categoryFilter);
        }

        const tbody = document.getElementById('inventory-table');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 40px;">No se encontraron materiales</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(p => `
            <tr>
                <td>
                    <strong>${p.nombre}</strong> ${p.marca ? `<small class="text-muted">(${p.marca})</small>` : ''}
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
            ui.showToast('Material guardado correctamente', 'success');
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
        
        document.getElementById('modal-title').innerText = 'Editar Material';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.nombre;
        document.getElementById('prod-brand').value = p.marca || '';
        document.getElementById('prod-initial-stock').disabled = true; // No permitir editar stock inicial al editar
        document.getElementById('prod-initial-stock').value = 0;
        document.getElementById('prod-category').value = p.categoria;
        document.getElementById('prod-min-stock').value = p.stock_minimo;
        document.getElementById('prod-desc').value = p.descripcion || '';
        document.getElementById('prod-oc').value = p.orden_compra || '';
        document.getElementById('prod-receipt-date').value = p.fecha_recepcion || '';
        
        ui.openModal('product-modal');
    },

    updateDashboard() {
        const list = db.getProductos();
        const critical = list.filter(p => p.stock_actual <= p.stock_minimo);
        
        const totalEl = document.getElementById('stat-total-products');
        const criticalEl = document.getElementById('stat-critical-stock');
        if (totalEl) totalEl.innerText = list.length;
        if (criticalEl) criticalEl.innerText = critical.length;

        // Update deliveries today count
        const today = new Date().toISOString().split('T')[0];
        const moves = db.getMovimientos();
        const todayDeliveries = moves.filter(m => m.tipo === 'SALIDA' && m.fecha && m.fecha.startsWith(today));
        const delivEl = document.getElementById('stat-deliveries-today');
        if (delivEl) delivEl.innerText = todayDeliveries.length;
        
        const criticalTable = document.getElementById('critical-stock-table');
        if (!criticalTable) return;

        if (critical.length === 0) {
            criticalTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--success); padding: 30px;"><i class="fa-solid fa-circle-check"></i> Todo el stock en orden</td></tr>`;
        } else {
            criticalTable.innerHTML = critical.map(p => `
                <tr>
                    <td><strong>${p.nombre}</strong> ${p.marca ? `<small class="text-muted">(${p.marca})</small>` : ''}</td>
                    <td>${p.categoria}</td>
                    <td><span class="badge badge-warning">${p.stock_actual}</span></td>
                    <td>${p.stock_minimo}</td>
                    <td style="color: var(--danger); font-weight: 600;">REABASTECER</td>
                </tr>
            `).join('');
        }

        // Update notification panel
        ui.updateNotifications();
    },

    updateDatalist() {
        const list = db.getProductos();
        const names = [...new Set(list.map(p => p.nombre))];
        const datalist = document.getElementById('material-names-list');
        if (datalist) {
            datalist.innerHTML = names.map(n => `<option value="${n}">`).join('');
        }
    },

    async importFromSeed() {
        if (!confirm(`¿Deseas importar ${productSeed.length} materiales de prueba al inventario?`)) return;

        ui.showToast('Iniciando importación de materiales...', 'info');
        let count = 0;
        try {
            for (const p of productSeed) {
                await db.saveProducto(p);
                count++;
            }
            ui.showToast(`Importación completada: ${count} materiales agregados.`, 'success');
            this.renderInventory();
            this.updateDashboard();
        } catch (error) {
            ui.showToast('Error en la importación: ' + error.message, 'danger');
        }
    }
};

window.products = products;
