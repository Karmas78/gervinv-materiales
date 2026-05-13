/**
 * UI Utility Module
 */
import { db } from '../db.js';

export const ui = {
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const icons = {
            success: 'fa-circle-check',
            danger: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    toggleView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        document.getElementById(`view-${viewId}`).classList.add('active');
        document.querySelector(`.nav-item[data-view="${viewId}"]`).classList.add('active');

        // Close sidebar on mobile after navigation
        this.closeSidebar();
    },

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    },

    formatDate(isoString) {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // --- Mobile Sidebar ---
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    },

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    },

    // --- Notifications ---
    updateNotifications() {
        const list = db.getProductos();
        const critical = list.filter(p => p.stock_actual <= p.stock_minimo);
        const badge = document.getElementById('notif-badge');
        const notifList = document.getElementById('notif-list');

        // Update badge
        const count = critical.length;
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);

        // Update panel content
        if (!notifList) return;

        if (count === 0) {
            notifList.innerHTML = `
                <div class="notif-empty">
                    <i class="fa-solid fa-circle-check"></i>
                    <p>Todo en orden. Sin alertas de stock.</p>
                </div>
            `;
        } else {
            notifList.innerHTML = critical.map(p => `
                <div class="notif-item">
                    <div class="notif-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <div class="notif-text">
                        <strong>${p.nombre} ${p.marca ? `(${p.marca})` : ''}</strong>
                        <small>Stock: <strong>${p.stock_actual}</strong> / Mínimo: ${p.stock_minimo} — ${p.categoria}</small>
                    </div>
                </div>
            `).join('');
        }
    },

    toggleNotifPanel() {
        const panel = document.getElementById('notif-panel');
        panel.classList.toggle('active');
    },

    closeNotifPanel() {
        const panel = document.getElementById('notif-panel');
        if (panel) panel.classList.remove('active');
    },

    // --- Excel Export ---
    exportToExcel(data, headers, filename) {
        if (!data || data.length === 0) {
            this.showToast('No hay datos para exportar', 'warning');
            return;
        }

        // Build CSV content with BOM for Excel compatibility
        const BOM = '\uFEFF';
        const headerRow = headers.map(h => `"${h.label}"`).join(',');
        const rows = data.map(row => 
            headers.map(h => {
                let val = row[h.key] ?? '';
                if (typeof val === 'string') val = val.replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')
        );
        
        const csv = BOM + headerRow + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast(`Archivo "${link.download}" descargado`, 'success');
    },

    exportInventory() {
        const data = db.getProductos();
        const headers = [
            { key: 'nombre', label: 'Producto' },
            { key: 'marca', label: 'Marca' },
            { key: 'categoria', label: 'Categoría' },
            { key: 'stock_actual', label: 'Stock Actual' },
            { key: 'stock_minimo', label: 'Stock Mínimo' },
            { key: 'descripcion', label: 'Descripción' }
        ];
        this.exportToExcel(data, headers, 'inventario_gervinv');
    },

    exportLoans() {
        const data = db.getPrestamos().map(l => ({
            ...l,
            fecha_prestamo_fmt: this.formatDate(l.fecha_prestamo),
            fecha_devolucion_fmt: l.fecha_devolucion_prevista ? new Date(l.fecha_devolucion_prevista).toLocaleDateString() : '-',
            fecha_devuelta: l.fecha_devolucion_real ? this.formatDate(l.fecha_devolucion_real) : '-'
        }));
        const headers = [
            { key: 'fecha_prestamo_fmt', label: 'Fecha Préstamo' },
            { key: 'producto_nombre', label: 'Equipo' },
            { key: 'cantidad', label: 'Cantidad' },
            { key: 'funcionario_nombre', label: 'Funcionario' },
            { key: 'fecha_devolucion_fmt', label: 'Devolución Prevista' },
            { key: 'estado', label: 'Estado' },
            { key: 'fecha_devuelta', label: 'Fecha Devolución Real' },
            { key: 'observaciones', label: 'Observaciones' }
        ];
        this.exportToExcel(data, headers, 'prestamos_gervinv');
    },

    exportHistory() {
        const moves = db.getMovimientos();
        const prods = db.getProductos();
        const data = moves.map(m => {
            const product = prods.find(p => p.id === m.producto_id);
            return {
                fecha: this.formatDate(m.fecha),
                tipo: m.tipo,
                producto: product ? product.nombre : 'N/A',
                cantidad: m.cantidad,
                responsable: m.responsable,
                referencia: m.referencia || ''
            };
        });
        const headers = [
            { key: 'fecha', label: 'Fecha' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'producto', label: 'Producto' },
            { key: 'cantidad', label: 'Cantidad' },
            { key: 'responsable', label: 'Responsable' },
            { key: 'referencia', label: 'Referencia' }
        ];
        this.exportToExcel(data, headers, 'historial_gervinv');
    }
};

window.ui = ui; // Global exposure for simple inline onclick handlers
