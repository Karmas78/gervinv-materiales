/**
 * Database Module - Firebase Firestore Integration
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, getDocs, setDoc, doc, updateDoc, 
    query, orderBy, onSnapshot, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// CONFIGURACIÓN DE FIREBASE DEL USUARIO
const firebaseConfig = {
  apiKey: "AIzaSyBUImu_ojX-z3SnDvBb0UzavP291xVkEYw",
  authDomain: "gervinv-materiales.firebaseapp.com",
  projectId: "gervinv-materiales",
  storageBucket: "gervinv-materiales.firebasestorage.app",
  messagingSenderId: "180324550670",
  appId: "1:180324550670:web:488de3b613b789e78e145f"
};

const app = initializeApp(firebaseConfig);
export const db_firestore = getFirestore(app);
export const auth_firebase = getAuth(app);

class Database {
    constructor() {
        this.cache = {
            productos: [],
            movimientos: [],
            funcionarios: [],
            prestamos: []
        };
    }

    /**
     * Inicializa la escucha en tiempo real de las colecciones
     */
    async init(onUpdateCallback) {
        // Escuchar Productos
        onSnapshot(collection(db_firestore, 'productos'), (snapshot) => {
            this.cache.productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (onUpdateCallback) onUpdateCallback('productos');
        });

        // Escuchar Movimientos (ordenados por fecha)
        const qMovs = query(collection(db_firestore, 'movimientos'), orderBy('fecha', 'desc'));
        onSnapshot(qMovs, (snapshot) => {
            this.cache.movimientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (onUpdateCallback) onUpdateCallback('movimientos');
        });

        // Escuchar Funcionarios
        onSnapshot(collection(db_firestore, 'funcionarios'), (snapshot) => {
            this.cache.funcionarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (onUpdateCallback) onUpdateCallback('funcionarios');
        });

        // Escuchar Préstamos
        onSnapshot(collection(db_firestore, 'prestamos'), (snapshot) => {
            this.cache.prestamos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (onUpdateCallback) onUpdateCallback('prestamos');
        });
    }

    // --- PRODUCTOS ---
    getProductos() {
        return this.cache.productos;
    }

    async saveProducto(product) {
        let isExisting = false;
        let existingId = null;

        // Comprobar si existe por nombre y marca, solo si es un producto nuevo
        if (!product.id) {
            const prodNameLower = product.nombre.trim().toLowerCase();
            const prodBrandLower = (product.marca || '').trim().toLowerCase();
            
            const existingProduct = this.cache.productos.find(p => 
                p.nombre.trim().toLowerCase() === prodNameLower &&
                (p.marca || '').trim().toLowerCase() === prodBrandLower
            );

            if (existingProduct) {
                isExisting = true;
                existingId = existingProduct.id;
            }
        }

        if (isExisting) {
            // Producto ya existe (con el mismo nombre y marca), solo agregamos el stock inicial mediante un movimiento
            const quantityToAdd = Number(product.stock_actual || 0);
            if (quantityToAdd > 0) {
                await this.registrarMovimiento({
                    tipo: 'ENTRADA',
                    producto_id: existingId,
                    cantidad: quantityToAdd,
                    responsable: 'Sistema',
                    referencia: 'Carga de stock adicional (Producto ya existente)'
                });
            }
            return; // Termina aquí
        }

        const id = product.id || `PR-${Date.now()}`;
        const prodRef = doc(db_firestore, 'productos', id);
        
        const data = {
            nombre: product.nombre,
            marca: product.marca || '',
            categoria: product.categoria,
            stock_minimo: Number(product.stock_minimo),
            descripcion: product.descripcion || '',
            stock_actual: Number(product.stock_actual || 0)
        };

        if (product.id) {
            // Edición normal
            // No podemos cambiar el stock_actual directamente al editar para no romper la consistencia,
            // pero el usuario solo edita info básica
            delete data.stock_actual; // Evitamos sobreescribir el stock actual en una edición
            await updateDoc(prodRef, data);
        } else {
            await setDoc(prodRef, data);
            // Si es nuevo y tiene stock inicial, registrar movimiento
            if (data.stock_actual > 0) {
                await this.registrarMovimiento({
                    tipo: 'ENTRADA',
                    producto_id: id,
                    cantidad: data.stock_actual,
                    responsable: 'Sistema',
                    referencia: 'Carga Inicial'
                });
            }
        }
    }

    // --- MOVIMIENTOS (CON TRANSACCIÓN PARA SEGURIDAD) ---
    async registrarMovimiento(mov) {
        const prodRef = doc(db_firestore, 'productos', mov.producto_id);
        const movRef = doc(collection(db_firestore, 'movimientos'));

        try {
            await runTransaction(db_firestore, async (transaction) => {
                const prodDoc = await transaction.get(prodRef);
                if (!prodDoc.exists()) throw "Producto no existe";

                const currentStock = Number(prodDoc.data().stock_actual || 0);
                const quantity = Number(mov.cantidad);
                let newStock = currentStock;

                if (mov.tipo === 'ENTRADA') {
                    newStock += quantity;
                } else {
                    if (currentStock < quantity) throw "Stock insuficiente";
                    newStock -= quantity;
                }

                // 1. Actualizar Stock del Producto
                transaction.update(prodRef, { stock_actual: newStock });

                // 2. Crear registro del Movimiento
                transaction.set(movRef, {
                    ...mov,
                    cantidad: quantity,
                    fecha: new Date().toISOString(),
                    timestamp: serverTimestamp()
                });
            });
        } catch (e) {
            console.error("Error en transacción:", e);
            throw e;
        }
    }

    getMovimientos() {
        return this.cache.movimientos;
    }

    getFuncionarios() {
        return this.cache.funcionarios;
    }

    getPrestamos() {
        return this.cache.prestamos;
    }

    async crearPrestamo(data) {
        // data: { items: [{id, nombre, qty}], funcionario_id, funcionario_nombre, fecha_devolucion_prevista, observaciones }
        const batchId = `LN-B-${Date.now()}`;
        
        for (const item of data.items) {
            const prestamoId = `LN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const ref = doc(db_firestore, 'prestamos', prestamoId);
            
            const payload = {
                producto_id: item.id,
                producto_nombre: item.nombre,
                cantidad: Number(item.qty),
                funcionario_id: data.funcionario_id,
                funcionario_nombre: data.funcionario_nombre,
                fecha_prestamo: new Date().toISOString(),
                fecha_devolucion_prevista: data.fecha_devolucion_prevista,
                estado: 'PENDIENTE',
                observaciones: data.observaciones || '',
                batch_id: batchId
            };

            // Registrar la SALIDA de stock
            await this.registrarMovimiento({
                tipo: 'SALIDA',
                producto_id: item.id,
                cantidad: item.qty,
                responsable: data.funcionario_nombre,
                referencia: `Préstamo Temporal - Ref: ${prestamoId}`
            });

            await setDoc(ref, payload);
        }
    }

    async devolverPrestamo(prestamoId) {
        const prestamo = this.cache.prestamos.find(p => p.id === prestamoId);
        if (!prestamo) throw new Error('Préstamo no encontrado');

        const ref = doc(db_firestore, 'prestamos', prestamoId);

        // Registrar la ENTRADA de stock
        await this.registrarMovimiento({
            tipo: 'ENTRADA',
            producto_id: prestamo.producto_id,
            cantidad: prestamo.cantidad || 1,
            responsable: 'Sistema (Devolución)',
            referencia: `Devolución de Préstamo - Ref: ${prestamoId}`
        });

        await updateDoc(ref, {
            estado: 'DEVUELTO',
            fecha_devolucion_real: new Date().toISOString()
        });
    }

    async saveFuncionario(data) {
        const id = data.id || `FC-${Date.now()}`;
        const ref = doc(db_firestore, 'funcionarios', id);
        const payload = {
            nombre: data.nombre,
            rut: data.rut,
            departamento: data.departamento
        };
        if (data.id) {
            await updateDoc(ref, payload);
        } else {
            await setDoc(ref, payload);
        }
    }
}

export const db = new Database();
