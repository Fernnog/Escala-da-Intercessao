import { initializeApp } from "https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js";
import * as firestoreCompat from "https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js";

// Configuração do Firebase (SUAS CREDENCIAIS)
const firebaseConfig = {
    apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg",
    authDomain: "perola-rara.firebaseapp.com",
    projectId: "perola-rara",
    storageBucket: "perola-rara.firebasestorage.app",
    messagingSenderId: "502232132512",
    appId: "1:502232132512:web:59f227a7d35b39cc8752c5",
    measurementId: "G-VHVMR10RSQ"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = firestoreCompat.getFirestore(app);

// Evento de clique no botão "Salvar Texto"
document.getElementById('salvarBtn').addEventListener('click', function() {
    const textoParaSalvar = document.getElementById('texto').value;

    if (textoParaSalvar.trim() === '') {
        document.getElementById('mensagem').textContent = 'Digite algo antes de salvar!';
        document.getElementById('mensagem').style.color = 'red';
        return;
    }

    firestoreCompat.addDoc(firestoreCompat.collection(db, "TestesMobile"), { // Coleção "TestesMobile"
        texto: textoParaSalvar,
        timestamp: new Date()
    })
    .then((docRef) => {
        console.log("Texto salvo com ID: ", docRef.id);
        document.getElementById('mensagem').textContent = 'Texto salvo com sucesso!';
        document.getElementById('mensagem').style.color = 'green';
        document.getElementById('texto').value = ''; // Limpa o campo
    })
    .catch((error) => {
        console.error("Erro ao salvar texto: ", error);
        document.getElementById('mensagem').textContent = 'Erro ao salvar o texto.';
        document.getElementById('mensagem').style.color = 'red';
    });
});
