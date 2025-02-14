// Importações CORRETAS para uso com <script> (NDM) - Firebase 9.x.x
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js";
import * as firestoreCompat from "https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js";

// Configuração do Firebase (SUAS CREDENCIAIS - **ATUALIZADAS PARA O NOVO PROJETO**)
const firebaseConfig = {
    apiKey: "AIzaSyDUbWB7F_4-tQ8K799wylf36IayGWgBuMU",
    authDomain: "diario-de-oracao-268d3.firebaseapp.com",
    projectId: "diario-de-oracao-268d3",
    storageBucket: "diario-de-oracao-268d3.firebasestorage.app",
    messagingSenderId: "561592831701",
    appId: "1:561592831701:web:2a682317486837fd795c5c",
    measurementId: "G-15YHNK7H2B"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = firestoreCompat.getFirestore(app);

// Função para exibir os textos na tabela
function exibirTextosNaTabela(textos) {
    const tabela = document.getElementById('textosTable').getElementsByTagName('tbody')[0];
    if (!tabela) {
        console.error("Corpo da tabela (tbody) não encontrado!");
        return;
    }
    tabela.innerHTML = ''; // Limpa a tabela

    textos.forEach(texto => {
        const linha = tabela.insertRow();
        const colunaTitulo = linha.insertCell();
        const colunaTexto = linha.insertCell();
        const colunaData = linha.insertCell();

        colunaTitulo.innerHTML = texto.titulo;
        colunaTexto.innerHTML = texto.texto;
        colunaData.innerHTML = new Date(texto.timestamp.seconds * 1000).toLocaleString();
    });
}

// Função debounce para otimizar a pesquisa
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Função para sanitizar a entrada do usuário (segurança)
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input; // Usa textContent para evitar injeção de HTML
    return div.innerHTML; // Obtém o HTML sanitizado
}

// Função para filtrar os textos (agora com debounce)
const filtrarTextos = debounce(function() {
    const termoPesquisa = document.getElementById('searchInput').value.toLowerCase();
    const linhas = document.getElementById('textosTable').getElementsByTagName('tbody')[0].getElementsByTagName('tr');

    for (let i = 0; i < linhas.length; i++) {
        const colunaTitulo = linhas[i].getElementsByTagName('td')[0];
        if (colunaTitulo) {
            const textoTitulo = colunaTitulo.textContent || colunaTitulo.innerText;
            if (textoTitulo.toLowerCase().indexOf(termoPesquisa) > -1) {
                linhas[i].style.display = "";
            } else {
                linhas[i].style.display = "none";
            }
        }
    }
}, 300); // Atraso de 300ms para o debounce


// Listener para a caixa de pesquisa (usa a função filtrarTextos com debounce)
document.getElementById('searchInput').addEventListener('keyup', filtrarTextos);

// Listener para o Firestore (com async/await e tratamento de erros)
firestoreCompat.onSnapshot(firestoreCompat.collection(db, "PerolaRara"), async (snapshot) => {
    const textos = [];
    snapshot.forEach(doc => {
        textos.push({
            id: doc.id,
            titulo: doc.data().titulo,
            texto: doc.data().texto,
            timestamp: doc.data().timestamp
        });
    });
    exibirTextosNaTabela(textos);
    filtrarTextos(); // Filtra após carregar/atualizar
}, (error) => {
    console.error("Erro ao ler dados do Firestore:", error);
    document.getElementById('mensagem').textContent = 'Erro ao carregar os textos.';
    document.getElementById('mensagem').style.color = 'red';
    setTimeout(() => { document.getElementById('mensagem').textContent = ''; }, 5000);
});

// Evento de envio do formulário (com async/await, sanitização e tratamento de erros)
document.getElementById('textForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const titulo = document.getElementById('titulo').value;
    const texto = document.getElementById('texto').value;

    if (titulo.trim() === '' || texto.trim() === '') {
        document.getElementById('mensagem').textContent = 'Por favor, preencha o título e o texto.';
        document.getElementById('mensagem').style.color = 'red';
        setTimeout(() => { document.getElementById('mensagem').textContent = ''; }, 5000);
        return;
    }

    const sanitizedTitulo = sanitizeInput(titulo); // Sanitiza o título
    const sanitizedTexto = sanitizeInput(texto);   // Sanitiza o texto

    try {
        const docRef = await firestoreCompat.addDoc(firestoreCompat.collection(db, "PerolaRara"), {
            titulo: sanitizedTitulo, // Usa o título sanitizado
            texto: sanitizedTexto,   // Usa o texto sanitizado
            timestamp: new Date()
        });

        console.log("Documento escrito com ID: ", docRef.id);
        document.getElementById('mensagem').textContent = 'Texto salvo com sucesso!';
        document.getElementById('mensagem').style.color = 'green';
        setTimeout(() => { document.getElementById('mensagem').textContent = ''; }, 5000);

        document.getElementById('titulo').value = '';
        document.getElementById('texto').value = '';

    } catch (error) {
        console.error("Erro ao adicionar documento: ", error);
        document.getElementById('mensagem').textContent = 'Erro ao salvar o texto.';
        document.getElementById('mensagem').style.color = 'red';
        setTimeout(() => { document.getElementById('mensagem').textContent = ''; }, 5000);
    }
});
