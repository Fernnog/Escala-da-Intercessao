/* script.js */

// Importa os módulos necessários (Firebase App, Analytics, Firestore e Auth)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";

import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import {

getAuth,

createUserWithEmailAndPassword,

signInWithEmailAndPassword,

signOut,

onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Configuração do Firebase (use os dados corretos do seu projeto)

const firebaseConfig = {

apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg",

authDomain: "perola-rara.firebaseapp.com",

projectId: "perola-rara",

storageBucket: "perola-rara.firebasestorage.app",

messagingSenderId: "502232132512",

appId: "1:502232132512:web:59f227a7d35b39cc8752c5",

measurementId: "G-VHVMR10RSQ"

};

// Inicializa o Firebase, Analytics, Firestore e Auth

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

const db = getFirestore(app);

const auth = getAuth(app);

// Referências aos elementos do HTML

const btnRegister = document.getElementById('btnRegister');

const btnLogin = document.getElementById('btnLogin');

const btnLogout = document.getElementById('btnLogout');

const authStatus = document.getElementById('authStatus');

const salvarBtn = document.getElementById('salvarBtn');

const textoInput = document.getElementById('texto');

const mensagem = document.getElementById('mensagem');

const emailInput = document.getElementById('email');

const passwordInput = document.getElementById('password');

// Função para registrar um novo usuário

btnRegister.addEventListener('click', () => {

const email = emailInput.value;

const password = passwordInput.value;

if(email.trim() === '' || password.trim() === '') {

alert("Preencha email e senha para registrar.");
return;
}

createUserWithEmailAndPassword(auth, email, password)

.then((userCredential) => {
  console.log("Usuário registrado:", userCredential.user.email);
})
.catch((error) => {
  console.error("Erro no registro:", error);
  alert("Erro no registro: " + error.message);
});
});

// Função para login com usuário existente

btnLogin.addEventListener('click', () => {

const email = emailInput.value;

const password = passwordInput.value;

if(email.trim() === '' || password.trim() === '') {

alert("Preencha email e senha para entrar.");
return;
}

signInWithEmailAndPassword(auth, email, password)

.then((userCredential) => {
  console.log("Usuário logado:", userCredential.user.email);
})
.catch((error) => {
  console.error("Erro no login:", error);
  alert("Erro no login: " + error.message);
});
});

// Função para logout

btnLogout.addEventListener('click', () => {

signOut(auth)

.then(() => {
  console.log("Usuário desconectado.");
})
.catch((error) => {
  console.error("Erro ao sair:", error);
});
});

// Monitoramento do estado de autenticação

onAuthStateChanged(auth, (user) => {

if (user) {

authStatus.textContent = "Usuário autenticado: " + user.email;
btnLogout.style.display = "inline-block";
btnLogin.style.display = "none";
btnRegister.style.display = "none";
} else {

authStatus.textContent = "Nenhum usuário autenticado";
btnLogout.style.display = "none";
btnLogin.style.display = "inline-block";
btnRegister.style.display = "inline-block";
}

});

// Função para salvar o texto digitado no Firestore (apenas se o usuário estiver autenticado)

salvarBtn.addEventListener('click', () => {

const user = auth.currentUser;

if (!user) {

mensagem.textContent = "Você precisa estar autenticado para salvar dados.";
mensagem.style.color = "red";
return;
}

const textoParaSalvar = textoInput.value;

if (textoParaSalvar.trim() === '') {

mensagem.textContent = 'Digite algo antes de salvar!';
mensagem.style.color = 'red';
return;
}

// Adiciona um novo documento na coleção "TestesMobile", incluindo informações do usuário

addDoc(collection(db, "TestesMobile"), {

uid: user.uid,
email: user.email,
texto: textoParaSalvar,
timestamp: new Date()
})

.then((docRef) => {

console.log("Texto salvo com ID:", docRef.id);
mensagem.textContent = 'Texto salvo com sucesso!';
mensagem.style.color = 'green';
textoInput.value = ''; // Limpa o campo de entrada
})

.catch((error) => {

console.error("Erro ao salvar texto:", error);
mensagem.textContent = 'Erro ao salvar o texto.';
mensagem.style.color = 'red';
});

});
