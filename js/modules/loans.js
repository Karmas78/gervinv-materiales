/**
 * Loans Module - Temporary Equipment Tracking
 */
import { db } from '../db.js';
import { ui } from './ui.js';

export const loans = {
    tempList: [],

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
                prods.map(p => `<option value="${p.id}">${p.nombre} ${p.marca ? `(${p.marca})` : ''} (Stock: ${p.stock_actual})</option>`).join('');
        }
    },

    addItem() {
        const prodId = document.getElementById('loan-product').value;
        const qty = parseInt(document.getElementById('loan-qty').value);
        
        if (!prodId || isNaN(qty) || qty <= 0) {
            ui.showToast('Seleccione un equipo y cantidad válida', 'warning');
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
        
        document.getElementById('loan-product').value = '';
        document.getElementById('loan-qty').value = '';
    },

    renderTempList() {
        const tbody = document.getElementById('loan-list');
        if (!tbody) return;
        tbody.innerHTML = this.tempList.map((item, idx) => `
            <tr>
                <td>${item.nombre}</td>
                <td><strong>${item.qty}</strong></td>
                <td><button type="button" class="btn-icon" onclick="loans.removeItem(${idx})"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    },

    removeItem(idx) {
        this.tempList.splice(idx, 1);
        this.renderTempList();
    },

    renderLoans() {
        const list = db.getPrestamos();
        const tbody = document.getElementById('loans-table-body');
        if (!tbody) return;

        tbody.innerHTML = list.sort((a,b) => new Date(b.fecha_prestamo) - new Date(a.fecha_prestamo)).map(l => `
            <tr class="${l.estado === 'PENDIENTE' ? 'row-pending' : 'row-returned'}">
                <td>${ui.formatDate(l.fecha_prestamo)}</td>
                <td><strong>${l.producto_nombre}</strong></td>
                <td><strong>${l.cantidad || 1}</strong></td>
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

    async process() {
        const staffSelect = document.getElementById('loan-staff');
        const staffId = staffSelect.value;
        const staffName = staffId ? staffSelect.options[staffSelect.selectedIndex].text : '';
        const returnDate = document.getElementById('loan-return-date').value;
        const obs = document.getElementById('loan-obs').value;

        if (!staffId || this.tempList.length === 0) {
            ui.showToast('Complete los datos del préstamo (funcionario y equipos)', 'warning');
            return;
        }

        const formData = {
            items: this.tempList,
            funcionario_id: staffId,
            funcionario_nombre: staffName,
            fecha_devolucion_prevista: returnDate,
            observaciones: obs
        };

        try {
            await db.crearPrestamo(formData);
            ui.showToast('Préstamo registrado', 'success');
            ui.closeModals();
            this.tempList = [];
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
