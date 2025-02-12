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

// Teste simples: Tentar ler dados (mesmo que não existam)
firestoreCompat.collection(db, "PerolaRara").get()
  .then(() => {
    document.getElementById('mensagem').textContent = 'Conexão com o Firebase OK!';
    document.getElementById('mensagem').style.color = 'green';
  })
  .catch((error) => {
    document.getElementById('mensagem').textContent = 'Erro na conexão com o Firebase: ' + error;
    document.getElementById('mensagem').style.color = 'red';
    console.error(error);
  });
