/**
 * Auth Module - Firebase Authentication
 */
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth_firebase } from '../db.js';

export const auth = {
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth_firebase, email, password);
            return userCredential.user;
        } catch (error) {
            console.error("Login error:", error.code);
            let message = 'Error al iniciar sesión';
            if (error.code === 'auth/invalid-credential') message = 'Correo o contraseña incorrectos';
            if (error.code === 'auth/user-not-found') message = 'Usuario no registrado';
            throw new Error(message);
        }
    },

    async logout() {
        await signOut(auth_firebase);
        window.location.reload();
    },

    onAuthChange(callback) {
        onAuthStateChanged(auth_firebase, callback);
    },

    getCurrentUser() {
        return auth_firebase.currentUser;
    }
};
