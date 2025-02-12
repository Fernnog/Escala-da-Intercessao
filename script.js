import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Substitua os dados abaixo pelas credenciais do seu projeto Firebase

const firebaseConfig = {

apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg",

authDomain: "perola-rara.firebaseapp.com",

projectId: "perola-rara",

storageBucket: "perola-rara.firebasestorage.app",

messagingSenderId: "502232132512",

appId: "1:502232132512:web:59f227a7d35b39cc8752c5",

measurementId: "G-VHVMR10RSQ"

};

// Inicializa o Firebase e o Firestore

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

// Função para salvar o texto digitado no Firestore

function salvarTexto() {

const textoInput = document.getElementById('texto');

const mensagem = document.getElementById('mensagem');

const textoParaSalvar = textoInput.value;

// Valida se o campo não está vazio

if (textoParaSalvar.trim() === '') {

mensagem.textContent = 'Digite algo antes de salvar!';
mensagem.style.color = 'red';
return;
}

// Adiciona um novo documento à coleção "TestesMobile"

addDoc(collection(db, "TestesMobile"), {

texto: textoParaSalvar,
timestamp: new Date()
})

.then((docRef) => {

console.log("Texto salvo com ID: ", docRef.id);
mensagem.textContent = 'Texto salvo com sucesso!';
mensagem.style.color = 'green';
textoInput.value = ''; // Limpa o campo de entrada
})

.catch((error) => {

console.error("Erro ao salvar texto: ", error);
mensagem.textContent = 'Erro ao salvar o texto.';
mensagem.style.color = 'red';
});

}

// Adiciona o evento de clique ao botão "Salvar Texto"

document.getElementById('salvarBtn').addEventListener('click', salvarTexto);
