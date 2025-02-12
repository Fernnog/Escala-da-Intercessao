import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js";

import * as firestoreCompat from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js";

// Configuração do Firebase – substitua pelos dados do seu projeto

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

// Função para salvar o texto digitado no Firestore

function salvarTexto() {

// Coleta o valor do input

const textoInput = document.getElementById('texto');

const mensagem = document.getElementById('mensagem');

const textoParaSalvar = textoInput.value;

// Verifica se o campo não está vazio

if (textoParaSalvar.trim() === '') {

mensagem.textContent = 'Digite algo antes de salvar!';
mensagem.style.color = 'red';
return;
}

// Tenta adicionar um novo documento à coleção "TestesMobile"

firestoreCompat.addDoc(

firestoreCompat.collection(db, "TestesMobile"),
{
  texto: textoParaSalvar,
  timestamp: new Date()
}
)

.then((docRef) => {

console.log("Texto salvo com ID: ", docRef.id);
mensagem.textContent = 'Texto salvo com sucesso!';
mensagem.style.color = 'green';
textoInput.value = ''; // Limpa o campo de texto
})

.catch((error) => {

console.error("Erro ao salvar texto: ", error);
mensagem.textContent = 'Erro ao salvar o texto.';
mensagem.style.color = 'red';
});

}

// Adiciona o evento de clique ao botão "Salvar Texto"

document.getElementById('salvarBtn').addEventListener('click', salvarTexto);

