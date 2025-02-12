// Importe as funções que você precisa dos SDKs que você importou
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Suas configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg",
  authDomain: "perola-rara.firebaseapp.com",
  projectId: "perola-rara",
  storageBucket: "perola-rara.firebasestorage.app",
  messagingSenderId: "502232132512",
  appId: "1:502232132512:web:59f227a7d35b39cc8752c5",
  measurementId: "G-VHVMR10RSQ"
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);

// Inicialize o Firestore
const db = getFirestore(app);

document.getElementById('textForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Impede o envio do formulário

    // Pega o valor do texto
    const texto = document.getElementById('texto').value;

    // Salva o texto no Firestore na coleção "PerolaRara" com o ID "mHqaY3YJ7sqOJsFfnLgb"
    setDoc(doc(db, "PerolaRara", "mHqaY3YJ7sqOJsFfnLgb"), {
        texto: texto,
        timestamp: new Date()
    })
    .then(() => {
        console.log("Documento escrito com ID: mHqaY3YJ7sqOJsFfnLgb");
        document.getElementById('mensagem').textContent = 'Texto salvo com sucesso!';
        document.getElementById('mensagem').style.color = 'green';
    })
    .catch((error) => {
        console.error("Erro ao adicionar documento: ", error);
        document.getElementById('mensagem').textContent = 'Erro ao salvar o texto.';
        document.getElementById('mensagem').style.color = 'red';
    });

    // Limpa o campo de texto após salvar
    document.getElementById('texto').value = '';
});
