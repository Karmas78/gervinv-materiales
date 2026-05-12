/**
 * Loans Module - Temporary Equipment Tracking
 */
import { db } from '../db.js';
import { ui } from './ui.js';

export const loans = {
    init() {
        this.renderLoans();
        this.fillSelectors();
    },

    fillSelectors() {
        const staff = db.getFuncionarios();
        const prods = db.getProductos();
        
        const staffSelect = document.getElementById('loan-staff');
        const prodSelect = document.getElementById('loan-product');
        
        if (staffSelect) {
            staffSelect.innerHTML = '<option value="">Seleccione funcionario...</option>' +
                staff.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
        }
        
        if (prodSelect) {
            prodSelect.innerHTML = '<option value="">Elegir equipo...</option>' +
                prods.map(p => `<option value="${p.id}">${p.nombre} (Stock: ${p.stock_actual})</option>`).join('');
        }
    },

    renderLoans() {
        const list = db.getPrestamos();
        const tbody = document.getElementById('loans-table-body');
        if (!tbody) return;

        tbody.innerHTML = list.sort((a,b) => new Date(b.fecha_prestamo) - new Date(a.fecha_prestamo)).map(l => `
            <tr class="${l.estado === 'PENDIENTE' ? 'row-pending' : 'row-returned'}">
                <td>${ui.formatDate(l.fecha_prestamo)}</td>
                <td><strong>${l.producto_nombre}</strong></td>
                <td>${l.funcionario_nombre}</td>
                <td>${l.fecha_devolucion_prevista ? new Date(l.fecha_devolucion_prevista).toLocaleDateString() : '-'}</td>
                <td>
                    <span class="badge ${l.estado === 'PENDIENTE' ? 'badge-warning' : 'badge-success'}">
                        ${l.estado}
                    </span>
                </td>
                <td>
                    ${l.estado === 'PENDIENTE' ? `
                        <button class="btn btn-secondary btn-small" onclick="loans.return('${l.id}')">
                            <i class="fa-solid fa-rotate-left"></i> Devolver
                        </button>
                    ` : `<small>${ui.formatDate(l.fecha_devolucion_real)}</small>`}
                </td>
            </tr>
        `).join('');
    },

    async create(formData) {
        try {
            await db.crearPrestamo(formData);
            ui.showToast('Préstamo registrado', 'success');
            ui.closeModals();
            this.renderLoans();
        } catch (error) {
            ui.showToast(error.message, 'danger');
        }
    },

    async return(id) {
        if (!confirm('¿Confirmar devolución de este equipo?')) return;
        try {
            await db.devolverPrestamo(id);
            ui.showToast('Equipo devuelto al inventario', 'success');
            this.renderLoans();
        } catch (error) {
            ui.showToast(error.message, 'danger');
        }
    }
};

window.loans = loans;
