/**
 * Staff Module - Personnel Management
 */
import { db } from '../db.js';
import { ui } from './ui.js';
import { staffSeed } from '../seed.js';

export const staff = {
    searchTerm: '',

    renderStaff() {
        let list = db.getFuncionarios();
        const tbody = document.getElementById('staff-table-body');
        if (!tbody) return;

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            list = list.filter(s =>
                s.nombre.toLowerCase().includes(term) ||
                s.rut.toLowerCase().includes(term) ||
                s.departamento.toLowerCase().includes(term)
            );
        }

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 40px;">No se encontraron funcionarios</td></tr>`;
            return;
        }
        
        tbody.innerHTML = list.map(s => `
            <tr>
                <td><strong>${s.nombre}</strong></td>
                <td>${s.rut}</td>
                <td>${s.departamento}</td>
                <td>
                    <button class="btn-icon" onclick="staff.edit('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async save(formData) {
        try {
            await db.saveFuncionario(formData);
            ui.showToast('Funcionario guardado correctamente', 'success');
            ui.closeModals();
            this.renderStaff();
        } catch (error) {
            ui.showToast(error.message, 'danger');
        }
    },

    edit(id) {
        const s = db.getFuncionarios().find(f => f.id === id);
        if (!s) return;
        
        document.getElementById('staff-modal-title').innerText = 'Editar Funcionario';
        document.getElementById('staff-id').value = s.id;
        document.getElementById('staff-name').value = s.nombre;
        document.getElementById('staff-rut').value = s.rut;
        document.getElementById('staff-dept').value = s.departamento;
        
        ui.openModal('staff-modal');
    },

    async importFromSeed() {
        if (!confirm(`¿Deseas importar ${staffSeed.length} funcionarios desde los archivos de la escuela?`)) return;
        
        ui.showToast('Iniciando importación...', 'info');
        let count = 0;
        try {
            for (const s of staffSeed) {
                await db.saveFuncionario(s);
                count++;
            }
            ui.showToast(`Importación completada: ${count} funcionarios agregados.`, 'success');
            this.renderStaff();
        } catch (error) {
            ui.showToast('Error en la importación: ' + error.message, 'danger');
        }
    }
};

window.staff = staff;
