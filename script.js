--- START OF FILE script.js ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";


// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDIXuruqM4M9oA_Rz3PSxVsXM1EEVVbprw",
    authDomain: "escaladeintercessao.firebaseapp.com",
    databaseURL: "https://escaladeintercessao-default-rtdb.firebaseio.com",
    projectId: "escaladeintercessao",
    storageBucket: "escaladeintercessao.firebasestorage.app",
    messagingSenderId: "875628397922",
    appId: "1:875628397922:web:219b624120eb9286e5d83b",
    measurementId: "G-9MGZ364KVZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let userUid = null; // Variável global para armazenar o UID do usuário

// --- Funções de Autenticação ---

const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const btnLogout = document.getElementById("btnLogout");
const btnCadastro = document.getElementById("btnCadastro");
const btnRestricoes = document.getElementById("btnRestricoes");
const btnRestricoesPermanentes = document.getElementById("btnRestricoesPermanentes");
const btnEscala = document.getElementById("btnEscala");
const btnExportarXLSX = document.getElementById("btnExportarXLSX");



function showLoginForm() {
    loginModal.style.display = 'block';
    registerModal.style.display = 'none';
    loginMessage.textContent = ''; // Limpa mensagens de erro
}

function showRegisterForm() {
    registerModal.style.display = 'block';
    loginModal.style.display = 'none';
    registerMessage.textContent = ''; // Limpa mensagens de erro
}

// Event listeners para mostrar/ocultar modais
document.getElementById('showRegister').addEventListener('click', showRegisterForm);
document.getElementById('showLogin').addEventListener('click', showLoginForm);

document.querySelectorAll('.close-button').forEach(button => {
  button.addEventListener('click', () => {
    loginModal.style.display = 'none';
    registerModal.style.display = 'none';
  });
});



loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginModal.style.display = 'none';
        // User is signed in (onAuthStateChanged handles the rest)
    } catch (error) {
        loginMessage.textContent = `Erro no login: ${error.message}`;
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        registerModal.style.display = 'none';
        // User is signed in (onAuthStateChanged handles the rest)
    } catch (error) {
        registerMessage.textContent = `Erro no cadastro: ${error.message}`;
    }
});

btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // Sign-out successful (onAuthStateChanged handles the rest)
    } catch (error) {
        console.error("Erro no logout:", error);
    }
});


// Observador de estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        userUid = user.uid;
        console.log("Usuário logado:", user.email, "UID:", userUid);
        btnLogout.style.display = 'block';
        btnCadastro.style.display = 'block';
        btnRestricoes.style.display = 'block';
        btnRestricoesPermanentes.style.display = 'block';
        btnEscala.style.display = 'block';
        btnExportarXLSX.style.display = 'block'; // Mostra o botão de exportar
        carregarDados();

    } else {
        userUid = null;
        console.log("Nenhum usuário logado");
        btnLogout.style.display = 'none';
        btnCadastro.style.display = 'none';
        btnRestricoes.style.display = 'none';
        btnRestricoesPermanentes.style.display = 'none';
        btnEscala.style.display = 'none';
        btnExportarXLSX.style.display = 'none'; // Oculta o botão de exportar
        limparListas();
        showLoginForm(); // Mostra o modal de login
    }
});

// --- Funções Utilitárias ---

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

function toggleConjuge() {
    document.getElementById('conjugeField').style.display =
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}


// --- Funções de Dados (Firebase) ---

async function salvarDados() {
    if (!userUid) return;

    const dados = { membros, restricoes, restricoesPermanentes };
    const userRef = ref(database, `users/${userUid}`);
    try {
        await set(userRef, dados);
    } catch (error) {
        console.error("Erro ao salvar dados:", error);
    }
}

function carregarDados() {
    if (!userUid) return;

    const userRef = ref(database, `users/${userUid}`);
    onValue(userRef, (snapshot) => {  // onValue já é assíncrono, não precisa de async/await aqui
        const dados = snapshot.val();
        if (dados) {
            membros = dados.membros || [];
            restricoes = dados.restricoes || [];
            restricoesPermanentes = dados.restricoesPermanentes || [];
            atualizarListaMembros();
            atualizarSelectMembros();
            atualizarListaRestricoes();
            atualizarListaRestricoesPermanentes();
        }
    });
}

function limparListas() {
    document.getElementById('listaMembros').innerHTML = '';
    document.getElementById('listaRestricoes').innerHTML = '';
    document.getElementById('listaRestricoesPermanentes').innerHTML = '';
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    selects.forEach(select => select.innerHTML = '<option value="">Selecione um membro</option>');
}



async function excluirMembro(index) {
    if (!userUid) return;

    membros.splice(index, 1);
    atualizarListaMembros();
    atualizarSelectMembros();
    await salvarDados(); // Usa await para garantir que os dados sejam salvos antes de continuar
}

async function excluirRestricao(index) {
    if (!userUid) return;

    restricoes.splice(index, 1);
    atualizarListaRestricoes();
    await salvarDados();
}

async function excluirRestricaoPermanente(index) {
    if (!userUid) return;

    restricoesPermanentes.splice(index, 1);
    atualizarListaRestricoesPermanentes();
    await salvarDados();
}


// --- Funções de Membros ---
function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    lista.innerHTML = membros.map((m, index) =>
        `<li>${m.nome} (${m.genero}) ${m.conjuge ? '- Cônjuge: ' + m.conjuge : ''}
        <button onclick="excluirMembro(${index})">Excluir</button></li>`).join('');
}

function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um membro</option>' +
            membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    });
}

// --- Funções de Restrições ---
function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${r.inicio.toLocaleDateString()} a ${r.fim.toLocaleDateString()}
        <button onclick="excluirRestricao(${index})">Excluir</button></li>`).join('');
}



function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button onclick="excluirRestricaoPermanente(${index})">Excluir</button></li>`).join('');
}



// --- Funções de Cadastro ---

document.getElementById('formCadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userUid) return;

    const nome = document.getElementById('nome').value;
    const genero = document.getElementById('genero').value;
    const conjugeParticipa = document.getElementById('conjugeParticipa').checked;
    const nomeConjuge = conjugeParticipa ? document.getElementById('nomeConjuge').value : null;

    if (nomeConjuge && !membros.some(m => m.nome === nomeConjuge)) {
        alert('O cônjuge deve estar cadastrado como membro!');
        return;
    }

    membros.push({ nome, genero, conjuge: nomeConjuge });
    atualizarListaMembros();
    atualizarSelectMembros();
    await salvarDados();
    e.target.reset();
    toggleConjuge();
});

document.getElementById('formRestricao').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userUid) return;

    const membro = document.getElementById('membroRestricao').value;
    const inicio = new Date(document.getElementById('dataInicio').value);
    const fim = new Date(document.getElementById('dataFim').value);

    if (!membro) {
        alert('Selecione um membro!');
        return;
    }
    if (fim < inicio) {
        alert('A data de fim deve ser posterior à data de início!');
        return;
    }

    restricoes.push({ membro, inicio, fim });
    atualizarListaRestricoes();
    await salvarDados();
    e.target.reset();
});

document.getElementById('formRestricaoPermanente').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userUid) return;

    const membro = document.getElementById('membroRestricaoPermanente').value;
    const diaSemana = document.getElementById('diaSemana').value;

    if (!membro) {
        alert('Selecione um membro!');
        return;
    }

    restricoesPermanentes.push({ membro, diaSemana });
    atualizarListaRestricoesPermanentes();
    await salvarDados();
    e.target.reset();
});

// --- Funções de Geração da Escala ---

// Função auxiliar para seleção ponderada (OTIMIZADA)
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) {
            return i;
        }
    }
    return weights.length - 1; // Fallback (raramente necessário)
}

// Função de seleção aleatória ponderada
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // Calcular pesos inversamente proporcionais às participações
    const pesos = membrosDisponiveis.map(m => 1 / (1 + participacoes[m.nome]));
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    const pesosNormalizados = pesos.map(p => p / somaPesos);

    // Selecionar membros com base nos pesos
    const selecionados = [];
    const disponiveis = [...membrosDisponiveis]; // Cópia para não alterar o original
    const pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indice = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indice, 1)[0];
        pesosTemp.splice(indice, 1);
        selecionados.push(membroSelecionado);
    }

    return selecionados;
}
// Função de revisão da escala (COM LIMITE DINÂMICO)
function revisarEscala(dias, participacoes) {

    const mediaParticipacoes = Object.values(participacoes).reduce((sum, p) => sum + p, 0) / Object.values(participacoes).length;
    const limiteDiferenca = Math.max(2, mediaParticipacoes * 0.2); // 20% da média, ou pelo menos 2

    const maxParticipacoes = Math.max(...Object.values(participacoes));
    const minParticipacoes = Math.min(...Object.values(participacoes));

    if (maxParticipacoes - minParticipacoes > limiteDiferenca) {
        const membrosOver = Object.entries(participacoes)
            .filter(([_, count]) => count === maxParticipacoes)
            .map(([nome]) => nome);
        const membrosUnder = Object.entries(participacoes)
            .filter(([_, count]) => count === minParticipacoes)
            .map(([nome]) => nome);

        dias.forEach(dia => {
            dia.selecionados.forEach((membro, idx) => {
                if (membrosOver.includes(membro.nome)) {
                    const membrosDisponiveis = membros.filter(m => {
                        const restricaoTemp = restricoes.some(r =>
                            r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim
                        );
                        const restricaoPerm = restricoesPermanentes.some(r =>
                            r.membro === m.nome && r.diaSemana === dia.tipo
                        );
                        return !restricaoTemp && !restricaoPerm && m.nome !== membro.nome;
                    });

                    const substituto = membrosDisponiveis.find(m =>
                        membrosUnder.includes(m.nome) &&
                        (dia.selecionados.length === 1 ||
                            (m.genero === dia.selecionados[1 - idx].genero ||
                                m.conjuge === dia.selecionados[1 - idx].nome ||
                                dia.selecionados[1 - idx].conjuge === m.nome))
                    );

                    if (substituto) {
                        dia.selecionados[idx] = substituto;
                        participacoes[membro.nome]--;
                        participacoes[substituto.nome]++;
                    }
                }
            });
        });
    }
}


// Evento de submissão do formulário
document.getElementById('formEscala').addEventListener('submit', (e) => {
    e.preventDefault();
     if (!userUid) {  //Verifica se há usuário logado
        alert("Você precisa estar logado para gerar a escala.");
        return;
    }

    // Captura das opções do formulário
    const gerarCultos = document.getElementById('escalaCultos').checked;
    const gerarSabado = document.getElementById('escalaSabado').checked;
    const gerarOração = document.getElementById('escalaOração').checked;
    const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
    const mes = parseInt(document.getElementById('mesEscala').value);
    const ano = parseInt(document.getElementById('anoEscala').value);
    const resultado = document.getElementById('resultadoEscala');

    // Define o período do mês
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0); // Último dia do mês
    resultado.innerHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3>`;

    // Lista de dias com eventos
    const dias = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.toLocaleString('pt-BR', { weekday: 'long' });

        // Cultos: Quarta, Domingo Manhã e Domingo Noite
        if (gerarCultos) {
            if (diaSemana === 'quarta-feira') {
                dias.push({ data: new Date(d), tipo: 'Quarta', selecionados: [] });
            }
            if (diaSemana === 'domingo') {
                dias.push({ data: new Date(d), tipo: 'Domingo Manhã', selecionados: [] });
                dias.push({ data: new Date(d), tipo: 'Domingo Noite', selecionados: [] });
            }
        }

        // Reuniões Online: Sábado
        if (gerarSabado && diaSemana === 'sábado') {
            dias.push({ data: new Date(d), tipo: 'Sábado', selecionados: [] });
        }

        // Oração no WhatsApp: Todos os dias
        if (gerarOração) {
            dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp', selecionados: [] });
        }
    }

    // Contador de participações
    const participacoes = {};
    membros.forEach(m => participacoes[m.nome] = 0);

    // Geração da escala
    dias.forEach(dia => {
        const membrosDisponiveis = membros.filter(m => {
            const restricaoTemp = restricoes.some(r => r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim);
            const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
            return !restricaoTemp && !restricaoPerm;
        });

        const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : (dia.tipo === 'Sábado' ? 1 : quantidadeCultos);
        if (membrosDisponiveis.length < qtdNecessaria) return;

        let selecionados = [];

        if (qtdNecessaria === 1) {
            const candidatos = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes);
            if (candidatos.length > 0) {
                selecionados = candidatos;
            }
        } else {
            const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes)[0];
            if (!primeiro) return;

            const membrosCompatíveis = membrosDisponiveis.filter(m =>
                m.nome !== primeiro.nome && (
                    m.genero === primeiro.genero ||
                    m.conjuge === primeiro.nome ||
                    primeiro.conjuge === m.nome
                )
            );

            const segundo = selecionarMembrosComAleatoriedade(membrosCompatíveis, 1, participacoes)[0];
            if (segundo) {
                selecionados = [primeiro, segundo];
            }
        }

        if (selecionados.length === qtdNecessaria) {
            dia.selecionados = selecionados;
            selecionados.forEach(m => participacoes[m.nome]++);
        }
    });

    // Revisar a escala
    revisarEscala(dias, participacoes);

    // Montar o HTML da escala
    let escalaHTML = '<ul>';
    dias.forEach(dia => {
        if (dia.selecionados.length > 0) {
            escalaHTML += `<li>${dia.data.toLocaleDateString()} - ${dia.tipo}: ${dia.selecionados.map(m => m.nome).join(', ')}</li>`;
        }
    });
    escalaHTML += '</ul>';
    resultado.innerHTML += escalaHTML;

    // Relatório de participações
    let relatorio = '<h4>Relatório de Participações</h4>';
    for (const [nome, count] of Object.entries(participacoes)) {
        relatorio += `<p>${nome}: ${count} participações</p>`;
    }
    resultado.innerHTML += relatorio;
});

// --- Funções de Exportar ---

function exportarEscalaXLSX() {
    if (!userUid) { // Verifica se o usuário está logado
        alert("Você precisa estar logado para exportar a escala.");
        return;
    }
    const wb = XLSX.utils.book_new();
    const dadosEscala = [['Data', 'Tipo', 'Pessoa 1', 'Pessoa 2']];
    document.querySelectorAll('#resultadoEscala ul li').forEach(li => {
        const [dataTipo, pessoas] = li.textContent.split(': ');
        const [data, tipo] = dataTipo.split(' - ');
        const nomes = pessoas.split(', ');
        dadosEscala.push([data, tipo, nomes[0], nomes[1] || '']);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala');
    XLSX.writeFile(wb, 'escala.xlsx');
}

// Inicialização: Mostra o formulário de login
showLoginForm();
