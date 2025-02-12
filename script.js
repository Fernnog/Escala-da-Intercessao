// Importe as funções que você precisa dos SDKs que você importou
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js";

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

// Função para exibir os textos na tabela
function exibirTextosNaTabela(textos) {
    const tabela = document.getElementById('textosTable').getElementsByTagName('tbody')[0];
    tabela.innerHTML = ''; // Limpa a tabela

    textos.forEach(texto => {
        let linha = tabela.insertRow();
        let colunaTexto = linha.insertCell();
        let colunaData = linha.insertCell();

        colunaTexto.innerHTML = texto.texto;
        colunaData.innerHTML = new Date(texto.timestamp.seconds * 1000).toLocaleString(); // Converte o timestamp para data/hora
    });
}

// Listener para manter a tabela atualizada em tempo real
onSnapshot(collection(db, "PerolaRara"), (snapshot) => {
    let textos = [];
    snapshot.forEach(doc => {
        textos.push({
            id: doc.id,
            texto: doc.data().texto,
            timestamp: doc.data().timestamp
        });
    });
    exibirTextosNaTabela(textos);
});

// Evento de envio do formulário
document.getElementById('textForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Impede o envio do formulário

    // Pega o valor do texto
    const texto = document.getElementById('texto').value;

    // Salva o texto no Firestore
    addDoc(collection(db, "PerolaRara"), {
        texto: texto,
        timestamp: new Date()
    })
    .then((docRef) => {
        console.log("Documento escrito com ID: ", docRef.id);
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
