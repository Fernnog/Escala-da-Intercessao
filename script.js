// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
  measurementId: "SEU_MEASUREMENT_ID"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);
const firebaseFirestore = getFirestore(firebaseApp);

// ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ====
let prayerTargets = [];
let archivedTargets = [];
let resolvedTargets = [];
let lastDisplayedTargets = [];
let currentPage = 1;
let currentArchivedPage = 1;
let currentResolvedPage = 1;
const targetsPerPage = 10;
let currentSearchTermMain = '';
let currentSearchTermArchived = '';
let currentSearchTermResolved = '';
let showDeadlineOnly = false;
let currentUserUID = null; // Variável para armazenar o UID do usuário logado
// ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES UTILITÁRIAS ====
// Função para formatar data para o formato ISO (YYYY-MM-DD)
function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Função para formatar data para exibição (DD/MM/YYYY)
function formatDateForDisplay(dateString) {
    if (!dateString || dateString.includes('NaN')) return 'Data Inválida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data Inválida';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Função para calcular o tempo decorrido
function timeElapsed(date) {
    const now = new Date();
    const targetDate = new Date(date);
    const elapsed = now - targetDate;

    const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));

    if (days < 7) {
        return `${days} dia(s)`;
    }
    const weeks = Math.floor(days / 7);
    return `${weeks} semana(s)`;
}

// Função para verificar se uma data está vencida em relação à data atual
function isDateExpired(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    return date < today;
}

// Função para gerar um ID único
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
// ==== FIM SEÇÃO - FUNÇÕES UTILITÁRIAS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES AUXILIARES ====
// Função para reidratar os alvos (converter timestamps do Firebase para objetos Date)
function rehydrateTargets(targets) {
    return targets.map(target => {
        if (target.date) {
            target.date = target.date.toDate();
        }
        if (target.archivedDate) {
            target.archivedDate = target.archivedDate.toDate();
        }
        if (target.deadlineDate) {
            target.deadlineDate = target.deadlineDate.toDate();
        }
        if (target.observations) {
            target.observations.forEach(obs => {
                if (obs.date) {
                    obs.date = obs.date.toDate();
                }
            });
        }
        return target;
    });
}

// Função para atualizar a interface de autenticação
function updateAuthUI(user) {
    const authStatus = document.getElementById('authStatus');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    const authSection = document.getElementById('authSection');
    const appContent = document.querySelector('.form-section'); // Seletor ajustado para form-section e daily-section
    const dailySection = document.querySelector('.daily-section');
    const mainMenu = document.getElementById('mainMenu');
    const actionMenu = document.getElementById('actionMenu');

    const viewAllTargetsButton = document.getElementById('viewAllTargetsButton');
    const viewArchivedButton = document.getElementById('viewArchivedButton');
    const viewResolvedButton = document.getElementById('viewResolvedButton');
    const backToMainButton = document.getElementById('backToMainButton');

    if (user) {
        currentUserUID = user.uid;
        authStatus.textContent = "Usuário autenticado: " + user.email;
        btnLogout.style.display = "inline-block";
        btnLogin.style.display = "none";
        btnRegister.style.display = "none";
        authSection.style.display = "none";
        appContent.style.display = "block"; // Mostra o conteúdo do app
        dailySection.style.display = "block";
        mainMenu.style.display = 'flex'; // Mostra o menu principal
        actionMenu.style.display = 'flex'; // Mostra o menu de ações
        viewAllTargetsButton.style.display = 'inline-block';
        viewArchivedButton.style.display = 'inline-block';
        viewResolvedButton.style.display = 'inline-block';
        backToMainButton.style.display = 'none';

        loadDataFromFirestore(user.uid); // Carrega dados do Firestore após o login

    } else {
        currentUserUID = null;
        authStatus.textContent = "Nenhum usuário autenticado";
        btnLogout.style.display = "none";
        btnLogin.style.display = "inline-block";
        btnRegister.style.display = "inline-block";
        authSection.style.display = "block";
        appContent.style.display = "none"; // Oculta o conteúdo do app
        dailySection.style.display = "none";
        mainMenu.style.display = 'none'; // Oculta o menu principal
        actionMenu.style.display = 'none'; // Oculta o menu de ações
        viewAllTargetsButton.style.display = 'none';
        viewArchivedButton.style.display = 'none';
        viewResolvedButton.style.display = 'none';
        backToMainButton.style.display = 'none';

        prayerTargets = [];
        archivedTargets = [];
        resolvedTargets = [];
        renderTargets();
        renderArchivedTargets();
        renderResolvedTargets();
        refreshDailyTargets();
    }
}

// ==== FIM SEÇÃO - FUNÇÕES AUXILIARES ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE MENSAGEM DE CONFIRMAÇÃO ====
// Função para mostrar a mensagem de sucesso
function showSuccessMessage(messageId) {
    const message = document.getElementById(messageId);
    message.classList.add('show');

    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}
// ==== FIM SEÇÃO - FUNÇÕES DE MENSAGEM DE CONFIRMAÇÃO ====

// ==== INÍCIO SEÇÃO - MANIPULAÇÃO DE DADOS FIREBASE ====
// Função para carregar dados do Firestore
async function loadDataFromFirestore(uid) {
    try {
        prayerTargets = await fetchTargets('prayerTargets', uid);
        archivedTargets = await fetchTargets('archivedTargets', uid);
        resolvedTargets = archivedTargets.filter(target => target.resolved);

        renderTargets();
        renderArchivedTargets();
        renderResolvedTargets();
        refreshDailyTargets();
        checkExpiredDeadlines();

    } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        alert("Erro ao carregar dados. Por favor, tente novamente mais tarde.");
    }
}

// Função genérica para buscar alvos de uma coleção no Firestore
async function fetchTargets(collectionName, uid) {
    const targetsCollection = collection(firebaseFirestore, `users/${uid}/${collectionName}`);
    const querySnapshot = await getDocs(targetsCollection);
    let targets = [];
    querySnapshot.forEach(doc => {
        targets.push({ id: doc.id, ...doc.data() });
    });
    return rehydrateTargets(targets);
}

// Função para adicionar alvo no Firestore
async function addTargetToFirestore(target, collectionName) {
    try {
        const targetsCollection = collection(firebaseFirestore, `users/${currentUserUID}/${collectionName}`);
        await setDoc(doc(targetsCollection), target);
    } catch (error) {
        console.error("Erro ao adicionar alvo no Firestore:", error);
        throw error;
    }
}

// Função para atualizar alvo no Firestore
async function updateTargetInFirestore(targetId, updates, collectionName) {
    try {
        const targetDocRef = doc(firebaseFirestore, `users/${currentUserUID}/${collectionName}`, targetId);
        await updateDoc(targetDocRef, updates);
    } catch (error) {
        console.error("Erro ao atualizar alvo no Firestore:", error);
        throw error;
    }
}

// Função para remover alvo do Firestore
async function deleteTargetFromFirestore(targetId, collectionName) {
    try {
        const targetDocRef = doc(firebaseFirestore, `users/${currentUserUID}/${collectionName}`, targetId);
        await deleteDoc(targetDocRef);
    } catch (error) {
        console.error("Erro ao excluir alvo do Firestore:", error);
        throw error;
    }
}

// ==== FIM SEÇÃO - MANIPULAÇÃO DE DADOS FIREBASE ====

// ==== INÍCIO SEÇÃO - INICIALIZAÇÃO ====
// Inicializar o monitor de estado de autenticação
onAuthStateChanged(firebaseAuth, (user) => {
    updateAuthUI(user);
});

document.addEventListener('DOMContentLoaded', () => {
    // ==== EVENT LISTENERS PARA AUTENTICAÇÃO ====
    const btnRegister = document.getElementById('btnRegister');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnForgotPassword = document.getElementById('btnForgotPassword');
    const passwordResetMessage = document.getElementById('passwordResetMessage');

    if (btnRegister) {
        btnRegister.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                alert("Preencha email e senha para registrar.");
                return;
            }
            try {
                const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
                console.log("Usuário registrado:", userCredential.user);
                updateAuthUI(userCredential.user);
            } catch (error) {
                console.error("Erro no registro:", error);
                alert("Erro no registro: " + error.message);
            }
        });
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passwordInput.value;

            if (!email || !password) {
                alert("Preencha email e senha para entrar.");
                return;
            }
            try {
                const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
                console.log("Usuário logado:", userCredential.user);
                updateAuthUI(userCredential.user);
            } catch (error) {
                console.error("Erro no login:", error);
                alert("Erro no login: " + error.message);
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await signOut(firebaseAuth);
                console.log("Usuário desconectado.");
                updateAuthUI(null);
            } catch (error) {
                console.error("Erro ao sair:", error);
            }
        });
    }

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', async () => {
            const email = emailInput.value;
            if (!email) {
                alert("Por favor, insira seu email para redefinir a senha.");
                return;
            }

            try {
                await sendPasswordResetEmail(firebaseAuth, email);
                passwordResetMessage.textContent = "Email de redefinição de senha enviado. Verifique sua caixa de entrada (e spam).";
                passwordResetMessage.style.display = "block";
                setTimeout(() => {
                    passwordResetMessage.style.display = "none";
                }, 5000);
            } catch (error) {
                console.error("Erro ao enviar email de redefinição:", error);
                alert("Erro ao redefinir a senha. Verifique o console para detalhes.");
                passwordResetMessage.textContent = "Erro ao enviar email de redefinição. Tente novamente.";
                passwordResetMessage.style.display = "block";
            }
        });
    }

    // ==== EVENT LISTENERS PARA MENU ====
    document.getElementById('viewAllTargetsButton').addEventListener('click', () => {
        mainPanel.style.display = "block";
        dailySection.style.display = "none";
        archivedPanel.style.display = "none";
        resolvedPanel.style.display = "none";
        showDeadlineOnly = false;
        document.getElementById("showDeadlineOnly").checked = false;
        renderTargets();
    });

    const viewArchivedButton = document.getElementById("viewArchivedButton");
    const viewResolvedButton = document.getElementById("viewResolvedButton");
    const backToMainButton = document.getElementById("backToMainButton");
    const mainPanel = document.getElementById("mainPanel");
    const dailySection = document.getElementById("dailySection");
    const archivedPanel = document.getElementById("archivedPanel");
    const resolvedPanel = document.getElementById("resolvedPanel");

    viewArchivedButton.addEventListener("click", () => {
        mainPanel.style.display = "none";
        dailySection.style.display = "none";
        archivedPanel.style.display = "block";
        resolvedPanel.style.display = "none";
        currentArchivedPage = 1;
        renderArchivedTargets();
    });

    viewResolvedButton.addEventListener("click", () => {
        mainPanel.style.display = "none";
        dailySection.style.display = "none";
        archivedPanel.style.display = "none";
        resolvedPanel.style.display = "block";
        currentResolvedPage = 1;
        renderResolvedTargets();
    });

    backToMainButton.addEventListener("click", () => {
        mainPanel.style.display = "none";
        dailySection.style.display = "block";
        archivedPanel.style.display = "none";
        resolvedPanel.style.display = "none";
        hideTargets();
        currentPage = 1;
    });

    document.getElementById('generateViewButton').addEventListener('click', generateViewHTML);
    document.getElementById('viewDaily').addEventListener('click', generateDailyViewHTML);
    document.getElementById("viewResolvedViewButton").addEventListener("click", () => {
        dateRangeModal.style.display = "block";
        startDateInput.value = '';
        endDateInput.value = '';
    });

    const dateRangeModal = document.getElementById("dateRangeModal");
    const closeDateRangeModalButton = document.getElementById("closeDateRangeModal");
    const generateResolvedViewButton = document.getElementById("generateResolvedView");
    const cancelDateRangeButton = document.getElementById("cancelDateRange");
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");

    closeDateRangeModalButton.addEventListener("click", () => {
        dateRangeModal.style.display = "none";
    });

    generateResolvedViewButton.addEventListener("click", () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const today = new Date();
        const formattedToday = formatDateToISO(today);
        const adjustedEndDate = endDate || formattedToday;

        generateResolvedViewHTML(startDate, adjustedEndDate);
        dateRangeModal.style.display = "none";
    });

    cancelDateRangeButton.addEventListener("click", () => {
        dateRangeModal.style.display = "none";
    });

    document.getElementById('searchMain').addEventListener('input', handleSearchMain);
    document.getElementById('searchArchived').addEventListener('input', handleSearchArchived);
    document.getElementById('searchResolved').addEventListener('input', handleSearchResolved);
    document.getElementById('showDeadlineOnly').addEventListener('change', handleDeadlineFilterChange);
    document.getElementById('showExpiredOnlyMain').addEventListener('change', handleExpiredOnlyMainChange);
    document.getElementById('refreshDaily').addEventListener('click', refreshDailyTargets);
    document.getElementById('copyDaily').addEventListener('click', copyDailyTargets);

    // ==== EVENT LISTENER PARA FORMULÁRIO DE CADASTRO ====
    document.getElementById('hasDeadline').addEventListener('change', function() {
        const deadlineContainer = document.getElementById('deadlineContainer');
        deadlineContainer.style.display = this.checked ? 'block' : 'none';
    });

    const form = document.getElementById("prayerForm");
    form.addEventListener("submit", handlePrayerFormSubmit);

    // Inicializar versículo diário
    displayRandomVerse();
    refreshDailyTargets();
});
// ==== FIM SEÇÃO - INICIALIZAÇÃO ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE RENDERIZAÇÃO ====
// Renderizar alvos principais
function renderTargets() {
    const targetList = document.getElementById("targetList");
    targetList.innerHTML = "";

    let filteredTargets = prayerTargets;
    if (showDeadlineOnly) {
        filteredTargets = filteredTargets.filter(t => t.hasDeadline && !isDateExpired(t.deadlineDate));
    }
    const showExpiredOnlyMain = document.getElementById("showExpiredOnlyMain").checked;
    if (showExpiredOnlyMain) {
        filteredTargets = filteredTargets.filter(t => t.hasDeadline && isDateExpired(t.deadlineDate));
    }

    filteredTargets = filterTargets(filteredTargets, currentSearchTermMain);

    const startIndex = (currentPage - 1) * targetsPerPage;
    const endIndex = startIndex + targetsPerPage;
    const targetsToDisplay = filteredTargets.slice(startIndex, endIndex);

    targetsToDisplay.forEach((target) => {
        const formattedDate = formatDateForDisplay(target.date);
        const deadlineTag = target.hasDeadline ? `<span class="deadline-tag ${isDateExpired(target.deadlineDate) ? 'expired' : ''}">Prazo: ${formatDateForDisplay(target.deadlineDate)}</span>` : '';
        const targetDiv = document.createElement("div");
        targetDiv.classList.add("target");
        targetDiv.innerHTML = `
            <h3>${deadlineTag} ${target.title}</h3>
            <p>${target.details}</p>
            <p><strong>Data:</strong> ${formattedDate}</p>
            <p><strong>Tempo Decorrido:</strong> ${timeElapsed(target.date)}</p>
            <p><strong>Status:</strong> Pendente</p>
            <button onclick="markAsResolved('${target.id}')" class="btn resolved">Marcar como Respondido</button>
            <button onclick="archiveTarget('${target.id}')" class="btn archive">Arquivar</button>
            <button onclick="toggleAddObservation('${target.id}')" class="btn add-observation">Adicionar Observação</button>
            ${target.hasDeadline ? `<button onclick="editDeadline('${target.id}')" class="btn edit-deadline">Editar Prazo</button>` : ''}
            <div class="add-observation-form" data-target-id="${target.id}" style="display: none;">
                <h4 class="target-title"></h4>
                <textarea placeholder="Escreva aqui a nova observação"></textarea>
                <input type="date" >
                <button onclick="saveObservation('${target.id}')" class="btn">Salvar Observação</button>
            </div>
            <div class="observations-list">
                ${renderObservations(target.observations)}
            </div>
        `;
        targetList.appendChild(targetDiv);
    });
    renderPagination('mainPanel', currentPage, filteredTargets);
}

// Renderizar alvos arquivados
function renderArchivedTargets() {
    const archivedList = document.getElementById("archivedList");
    archivedList.innerHTML = "";
    const filteredTargets = filterTargets(archivedTargets, currentSearchTermArchived);
    const startIndex = (currentArchivedPage - 1) * targetsPerPage;
    const endIndex = startIndex + targetsPerPage;
    const targetsToDisplay = filteredTargets.slice(startIndex, endIndex);

    targetsToDisplay.forEach((target) => {
        const formattedDate = formatDateForDisplay(target.date);
        const formattedArchivedDate = formatDateForDisplay(target.archivedDate);
        const archivedDiv = document.createElement("div");
        archivedDiv.classList.add("target");
        archivedDiv.innerHTML = `
            <h3>${target.title}</h3>
            <p>${target.details}</p>
            <p><strong>Data Original:</strong> ${formattedDate}</p>
            <p><strong>Tempo Decorrido:</strong> ${timeElapsed(target.date)}</p>
            <p><strong>Status:</strong> ${target.resolved ? "Respondido" : "Arquivado"}</p>
            <p><strong>Data de Arquivo:</strong> ${formattedArchivedDate}</p>
            <button onclick="deleteArchivedTarget('${target.id}')" class="btn delete">Excluir</button>
        `;
        archivedList.appendChild(archivedDiv);
    });
    renderPagination('archivedPanel', currentArchivedPage, filteredTargets);
}

// Renderizar alvos respondidos
function renderResolvedTargets() {
    const resolvedList = document.getElementById("resolvedList");
    resolvedList.innerHTML = "";
    const filteredTargets = filterTargets(resolvedTargets, currentSearchTermResolved);
    const startIndex = (currentResolvedPage - 1) * targetsPerPage;
    const endIndex = startIndex + targetsPerPage;
    const targetsToDisplay = filteredTargets.slice(startIndex, endIndex);

    targetsToDisplay.forEach((target) => {
        const formattedDate = formatDateForDisplay(target.date);
        const resolvedDate = formatDateForDisplay(target.archivedDate);
        const resolvedDiv = document.createElement("div");
        resolvedDiv.classList.add("target", "resolved");
        resolvedDiv.innerHTML = `
            <h3>${target.title}</h3>
            <p>${target.details}</p>
            <p><strong>Data Original:</strong> ${formattedDate}</p>
            <p><strong>Tempo Decorrido:</strong> ${timeElapsed(target.date)}</p>
            <p><strong>Status:</strong> Respondido</p>
            <p><strong>Data de Resolução:</strong> ${resolvedDate}</p>
        `;
        resolvedList.appendChild(resolvedDiv);
    });
    renderPagination('resolvedPanel', currentResolvedPage, filteredTargets);
}

// Função para renderizar a paginação
function renderPagination(panelId, page, targets) {
    const totalPages = Math.ceil(targets.length / targetsPerPage);
    let paginationDiv = document.getElementById("pagination-" + panelId);
    if (!paginationDiv) {
        paginationDiv = document.createElement("div");
        paginationDiv.id = "pagination-" + panelId;
        document.getElementById(panelId).appendChild(paginationDiv);
    }
    paginationDiv.innerHTML = "";

    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    paginationDiv.style.display = 'flex';
    paginationDiv.style.justifyContent = 'center';
    paginationDiv.style.margin = '10px 0';

    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement("a");
        pageLink.href = "#";
        pageLink.textContent = i;
        pageLink.classList.add("page-link");
        if (i === page) {
            pageLink.classList.add('active');
        }
        pageLink.addEventListener("click", (event) => {
            event.preventDefault();
            if (panelId === 'mainPanel') {
                currentPage = i;
                renderTargets();
            } else if (panelId === 'archivedPanel') {
                currentArchivedPage = i;
                renderArchivedTargets();
            } else if (panelId === 'resolvedPanel') {
                currentResolvedPage = i;
                renderResolvedTargets();
            }
        });
        paginationDiv.appendChild(pageLink);
    }
}

// Renderizar as observações de um alvo
function renderObservations(observations) {
    if (!observations || observations.length === 0) return '';

    let observationsHTML = '<h4>Observações:</h4>';
    observations.forEach(obs => {
        observationsHTML += `<p><strong>${formatDateForDisplay(obs.date)}:</strong> ${obs.observation}</p>`;
    });
    return observationsHTML;
}
// ==== FIM SEÇÃO - FUNÇÕES DE RENDERIZAÇÃO ====

// ==== INÍCIO SEÇÃO - MANIPULAÇÃO DE ALVOS ====
// Adicionar alvo - Manipulação com Firestore
async function handlePrayerFormSubmit(e) {
    e.preventDefault();
    const hasDeadline = document.getElementById("hasDeadline").checked;
    const deadlineDate = hasDeadline ? new Date(document.getElementById("deadlineDate").value + "T00:00:00") : null;
    const newTarget = {
        title: document.getElementById("title").value,
        details: document.getElementById("details").value,
        date: new Date(document.getElementById("date").value + "T00:00:00"),
        resolved: false,
        observations: [],
        hasDeadline: hasDeadline,
        deadlineDate: deadlineDate
    };

    try {
        await addTargetToFirestore(newTarget, 'prayerTargets');
        document.getElementById("prayerForm").reset();
        await loadDataFromFirestore(currentUserUID); // Recarrega os dados
        refreshDailyTargets();
    } catch (error) {
        alert("Erro ao adicionar alvo. Tente novamente.");
    }
}

// Marcar como Respondido - Manipulação com Firestore
async function markAsResolved(targetId) {
    try {
        const targetIndex = prayerTargets.findIndex(target => target.id === targetId);
        if (targetIndex === -1) {
            console.error("Alvo não encontrado.");
            return;
        }

        const formattedDate = new Date();
        const targetToArchive = prayerTargets[targetIndex];

        // Atualizar no Firestore como resolvido e mover para arquivados
        await updateTargetInFirestore(targetId, { resolved: true, archivedDate: formattedDate }, 'prayerTargets');
        await addTargetToFirestore({ ...targetToArchive, resolved: true, archivedDate: formattedDate }, 'archivedTargets');
        await deleteTargetFromFirestore(targetId, 'prayerTargets');

        await loadDataFromFirestore(currentUserUID); // Recarrega os dados
        refreshDailyTargets();
    } catch (error) {
        console.error("Erro ao marcar como resolvido:", error);
        alert("Erro ao marcar como resolvido. Tente novamente.");
    }
}

// Arquivar Alvo - Manipulação com Firestore
async function archiveTarget(targetId) {
    try {
        const targetIndex = prayerTargets.findIndex(target => target.id === targetId);
        if (targetIndex === -1) {
            console.error("Alvo não encontrado.");
            return;
        }

        const formattedDate = new Date();
        const targetToArchive = prayerTargets[targetIndex];

        // Mover para arquivados no Firestore
        await addTargetToFirestore({ ...targetToArchive, archivedDate: formattedDate }, 'archivedTargets');
        await deleteTargetFromFirestore(targetId, 'prayerTargets');

        await loadDataFromFirestore(currentUserUID); // Recarrega os dados
        refreshDailyTargets();
    } catch (error) {
        console.error("Erro ao arquivar alvo:", error);
        alert("Erro ao arquivar alvo. Tente novamente.");
    }
}

// Excluir Alvo Arquivado - Manipulação com Firestore
async function deleteArchivedTarget(targetId) {
    if (confirm("Tem certeza de que deseja excluir este alvo permanentemente? Esta ação não pode ser desfeita.")) {
        try {
            await deleteTargetFromFirestore(targetId, 'archivedTargets');
            await loadDataFromFirestore(currentUserUID); // Recarrega os dados
            showSuccessMessage('deleteSuccessMessage');
        } catch (error) {
            console.error("Erro ao excluir alvo arquivado:", error);
            alert("Erro ao excluir alvo arquivado. Tente novamente.");
        }
    }
}

// Alternar formulário de observação
function toggleAddObservation(targetId) {
    const form = document.querySelector(`.add-observation-form[data-target-id="${targetId}"]`);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';

    if (form.style.display === 'block') {
        const target = prayerTargets.find(t => t.id === targetId);
        form.querySelector('.target-title').textContent = `Adicionando observação para: ${target.title}`;
    }
}

// Salvar observação - Manipulação com Firestore
async function saveObservation(targetId) {
    const form = document.querySelector(`.add-observation-form[data-target-id="${targetId}"]`);
    const textarea = form.querySelector('textarea');
    const dateInput = form.querySelector('input[type="date"]');
    const observationText = textarea.value.trim();
    const observationDateValue = dateInput.value;

    if (observationText !== "") {
        let observationDate = observationDateValue ? new Date(observationDateValue + "T00:00:00") : new Date();
        const newObservation = {
            date: observationDate,
            observation: observationText,
        };

        try {
            const targetIndex = prayerTargets.findIndex(t => t.id === targetId);
            if (targetIndex !== -1) {
                const updatedObservations = [...prayerTargets[targetIndex].observations, newObservation];
                await updateTargetInFirestore(targetId, { observations: updatedObservations }, 'prayerTargets');
                await loadDataFromFirestore(currentUserUID); // Recarrega os dados
            }
        } catch (error) {
            console.error("Erro ao salvar observação:", error);
            alert("Erro ao salvar observação. Tente novamente.");
        } finally {
            textarea.value = "";
            dateInput.value = "";
            form.style.display = "none";
        }
    } else {
        alert("Por favor, insira o texto da observação.");
    }
}

// Editar prazo de validade - Manipulação com Firestore
async function editDeadline(targetId) {
    const target = prayerTargets.find(t => t.id === targetId);
    if (!target) {
        console.error("Alvo não encontrado.");
        return;
    }

    const currentDeadline = target.deadlineDate ? formatDateForDisplay(target.deadlineDate) : '';
    const newDeadlineStr = prompt("Insira a nova data de prazo de validade (DD/MM/YYYY):", currentDeadline);

    if (newDeadlineStr === null) return;

    if (!isValidDate(newDeadlineStr)) {
        alert("Data inválida. Por favor, use o formato DD/MM/YYYY.");
        return;
    }

    const newDeadlineISO = convertToISO(newDeadlineStr);
    const newDeadlineDate = new Date(newDeadlineISO + "T00:00:00");

    try {
        await updateTargetInFirestore(targetId, { deadlineDate: newDeadlineDate, hasDeadline: true }, 'prayerTargets');
        await loadDataFromFirestore(currentUserUID); // Recarrega os dados
        alert(`Prazo de validade do alvo "${target.title}" atualizado para ${newDeadlineStr}.`);
    } catch (error) {
        console.error("Erro ao atualizar prazo de validade:", error);
        alert("Erro ao atualizar prazo de validade. Tente novamente.");
    }
}

// ==== FIM SEÇÃO - MANIPULAÇÃO DE ALVOS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE BUSCA E FILTRO ====
function filterTargets(targets, searchTerm) {
    if (!searchTerm) return targets;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return targets.filter(target =>
        target.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        target.details.toLowerCase().includes(lowerCaseSearchTerm) ||
        (target.observations && target.observations.some(obs => obs.observation.toLowerCase().includes(lowerCaseSearchTerm)))
    );
}

function handleSearchMain(event) {
    currentSearchTermMain = event.target.value;
    currentPage = 1;
    renderTargets();
}

function handleSearchArchived(event) {
    currentSearchTermArchived = event.target.value;
    currentArchivedPage = 1;
    renderArchivedTargets();
}

function handleSearchResolved(event) {
    currentSearchTermResolved = event.target.value;
    currentResolvedPage = 1;
    renderResolvedTargets();
}

// Função para lidar com a mudança no filtro de alvos por prazo
function handleDeadlineFilterChange() {
    showDeadlineOnly = document.getElementById("showDeadlineOnly").checked;
    currentPage = 1;
    renderTargets();
}

// Função para lidar com a mudança no filtro de alvos por prazo (filtro novo)
function handleExpiredOnlyMainChange() {
    currentPage = 1;
    renderTargets();
}
// ==== FIM SEÇÃO - FUNÇÕES DE BUSCA E FILTRO ====

// ==== INÍCIO SEÇÃO - GERAÇÃO DE VISUALIZAÇÃO (HTML) ====
// Função para gerar HTML da visualização geral (alterada para usar dados atuais em memória)
function generateViewHTML() {
    const verseElement = document.getElementById('dailyVerses');
    const currentVerse = verseElement ? verseElement.textContent : 'Versículo não encontrado.';
    const targetsForView = prayerTargets; // Usa prayerTargets atuais

    let htmlContent = `<!DOCTYPE html>...`; // Conteúdo HTML (igual ao código anterior)

    // ... (resto da função generateViewHTML, adaptando para usar targetsForView) ...
}

// Função para gerar HTML da visualização diária (alterada para usar alvos diários atuais)
function generateDailyViewHTML() {
    const verseElement = document.getElementById('dailyVerses');
    const currentVerse = verseElement ? verseElement.textContent : 'Versículo não encontrado.';
    const dailyTargetsElement = document.getElementById("dailyTargets");
    const dailyTargetsHTML = Array.from(dailyTargetsElement.children); // Pega os alvos diários renderizados

    let htmlContent = `<!DOCTYPE html>...`; // Conteúdo HTML (igual ao código anterior)

    // ... (resto da função generateDailyViewHTML, adaptando para usar dailyTargetsHTML) ...
}

// Função para gerar HTML da visualização de respondidos (alterada para usar resolvedTargets filtrados)
function generateResolvedViewHTML(startDate, endDate) {
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;
    const filteredResolvedTargets = resolvedTargets.filter(target => { // Filtra resolvedTargets em memória
        // ... (lógica de filtro de data, igual ao código anterior) ...
    });

    let htmlContent = `<!DOCTYPE html>...`; // Conteúdo HTML (igual ao código anterior)

    // ... (resto da função generateResolvedViewHTML, adaptando para usar filteredResolvedTargets) ...
}
// ==== FIM SEÇÃO - GERAÇÃO DE VISUALIZAÇÃO (HTML) ====

// ==== INÍCIO SEÇÃO - VERSÍCULOS BÍBLICOS ====
const verses = [
    "Mateus 7:7-8: “Peçam, e será dado a vocês; busquem, e encontrarão; batam, e a porta será aberta a vocês. Pois todo o que pede recebe; o que busca encontra; e àquele que bate, a porta será aberta.”",
    "Marcos 11:24: \"Portanto, eu digo a vocês, tudo o que pedirem em oração, creiam que já o receberam, e será de vocês.\"",
    "João 14:13-14: “E eu farei o que vocês pedirem em meu nome, para que o Pai seja glorificado no Filho. O que vocês pedirem em meu nome, eu farei.”",
    "Filipenses 4:6-7: “Não se preocupem com nada, mas em todas as situações, pela oração e petição, com ação de graças, apresentem seus pedidos a Deus. E a paz de Deus, que excede todo o entendimento, guardará os seus corações e as suas mentes em Cristo Jesus.”",
    "1 Tessalonicenses 5:16-18: “Alegrem-se sempre, orem continuamente, deem graças em todas as circunstâncias; pois esta é a vontade de Deus para vocês em Cristo Jesus.”",
    "Tiago 5:13-16: “Há alguém entre vocês que está em apuros? Que ele ore. Há alguém feliz? Que ele cante louvores. Há alguém entre vocês que está doente? Que ele chame os presbíteros da igreja para orar por ele e ungi-lo com óleo em nome do Senhor. E a oração oferecida com fé fará o doente ficar bom; o Senhor o levantará. Se ele pecou, ele será perdoado. Portanto, confessem seus pecados uns aos outros e orem uns pelos outros para que vocês possam ser curados. A oração de um justo é poderosa e eficaz.”",
    "1 João 5:14-15: “Esta é a confiança que temos ao nos aproximarmos de Deus: que se pedirmos qualquer coisa de acordo com a sua vontade, ele nos ouve. E se sabemos que ele nos ouve — tudo o que pedimos — sabemos que temos o que lhe pedimos.”",
    "Efésios 6:18: \"Orem no Espírito em todas as ocasiões com todo tipo de orações e pedidos. Com isso em mente, estejam alertas e sempre continuem a orar por todo o povo do Senhor.\"",
    "1 Timóteo 2:1-2: \"Eu exorto, então, antes de tudo, que petições, orações, intercessões e ações de graças sejam feitas para todos os povos, para reis e todos aqueles em autoridade, para que possamos viver vidas pacíficas e tranquilas em toda a piedade e santidade.\"",
    "2 Crônicas 7:14: “Se o meu povo, que se chama pelo meu nome, se humilhar, e orar, e buscar a minha face, e se desviar dos seus maus caminhos, então ouvirei dos céus, perdoarei os seus pecados, e sararei a sua terra.”",
    "Salmos 34:17: “Os justos clamam, o Senhor os ouve, e os livra de todas as suas angústias.”",
    "Jeremias 33:3: “Clama a mim, e responder-te-ei, e anunciar-te-ei coisas grandes e firmes que não sabes.”",
    "Salmos 145:18-19: “Perto está o Senhor de todos os que o invocam, de todos os que o invocam em verdade. Ele cumprirá o desejo dos que o temem; ouvirá o seu clamor, e os salvará.”",
    "Daniel 9:18: “Inclina, ó Deus meu, os ouvidos, e ouve; abre os olhos, e olha para a nossa desolação, e para a cidade que é chamada pelo teu nome; porque não lançamos as nossas súplicas perante a tua face confiados em nossas justiças, mas em tuas muitas misericórdias.”",
    "Provérbios 15:29: “O Senhor está longe dos perversos, mas ouve a oração dos justos.”",
    "1 Reis 18:37: “Responde-me, Senhor, responde-me, para que este povo saiba que tu, Senhor, és Deus, e que tu fizeste o coração deles voltar para ti.”",
    "Isaías 65:24: “E será que antes que clamem, eu responderei; estando eles ainda falando, eu os ouvirei.”"
];
function displayRandomVerse() {
    const randomIndex = Math.floor(Math.random() * verses.length);
    const verseElement = document.getElementById('dailyVerses');
    verseElement.textContent = verses[randomIndex];
}
// ==== FIM SEÇÃO - VERSÍCULOS BÍBLICOS ====

// ==== INÍCIO SEÇÃO - FUNCIONALIDADE DO BOTÃO "OREI!" ====
function addPrayButtonFunctionality(dailyDiv, targetIndex) {
    const prayButton = document.createElement("button");
    prayButton.textContent = "Orei!";
    prayButton.classList.add("pray-button");
    prayButton.onclick = () => {
        dailyDiv.remove();
        checkIfAllPrayersDone();
    };
    dailyDiv.insertBefore(prayButton, dailyDiv.firstChild);
}

function copyDailyTargets() {
    const dailyTargetsElement = document.getElementById("dailyTargets");
    if (!dailyTargetsElement) {
        alert("Não foi possível encontrar os alvos diários para copiar.");
        return;
    }

    const dailyTargetsText = Array.from(dailyTargetsElement.children).map(div => {
        const title = div.querySelector('h3')?.textContent || '';
        const details = div.querySelector('p:nth-of-type(1)')?.textContent || '';
        const timeElapsedText = div.querySelector('p:nth-of-type(2)')?.textContent || '';

        const observations = Array.from(div.querySelectorAll('.observations-list p'))
            .map(p => p.textContent)
            .join('\n');

        let result = `${title}\n${details}\n${timeElapsedText}`;
        if (observations) {
            result += `\nObservações:\n${observations}`;
        }
        return result;
    }).join('\n\n---\n\n');

    navigator.clipboard.writeText(dailyTargetsText).then(() => {
        alert('Alvos diários copiados para a área de transferência!');
    }, (err) => {
        console.error('Erro ao copiar texto: ', err);
        alert('Não foi possível copiar os alvos diários, por favor tente novamente.');
    });
}


function checkIfAllPrayersDone() {
    const dailyTargets = document.getElementById("dailyTargets");
    if (dailyTargets.children.length === 0) {
        displayCompletionPopup();
    }
}

function displayCompletionPopup() {
    const popup = document.getElementById('completionPopup');
    popup.style.display = 'block';
}

document.getElementById('closePopup').addEventListener('click', () => {
    document.getElementById('completionPopup').style.display = 'none';
});
// ==== FIM SEÇÃO - FUNCIONALIDADE DO BOTÃO "OREI!" ====

// Atualizar os alvos diários
function refreshDailyTargets() {
    const dailyTargets = document.getElementById("dailyTargets");
    dailyTargets.innerHTML = "";
    const dailyTargetsCount = Math.min(prayerTargets.length, 10);

    let availableTargets = prayerTargets.filter(target => !lastDisplayedTargets.includes(target));

    if (availableTargets.length === 0) {
        lastDisplayedTargets = [];
        availableTargets = prayerTargets.slice();
    }

    const shuffledTargets = availableTargets.sort(() => 0.5 - Math.random());
    const selectedTargets = shuffledTargets.slice(0, dailyTargetsCount);

    lastDisplayedTargets = [...lastDisplayedTargets, ...selectedTargets].slice(-prayerTargets.length);

    selectedTargets.forEach((target, index) => {
        const dailyDiv = document.createElement("div");
        dailyDiv.classList.add("target");

        const deadlineTag = target.hasDeadline ? `<span class="deadline-tag ${isDateExpired(target.deadlineDate) ? 'expired' : ''}">Prazo: ${formatDateForDisplay(target.deadlineDate)}</span>` : '';
        let contentHTML = `
            <h3>${deadlineTag} ${target.title}</h3>
            <p>${target.details}</p>
            <p><strong>Tempo Decorrido:</strong> ${timeElapsed(target.date)}</p>
            <div class="observations-list">
                ${renderObservations(target.observations)}
            </div>
        `;

        dailyDiv.innerHTML = contentHTML;
        dailyTargets.appendChild(dailyDiv);
        addPrayButtonFunctionality(dailyDiv, index);
    });
    displayRandomVerse();
}

function hideTargets(){
   const targetList = document.getElementById("targetList");
    targetList.innerHTML = "";
}

function isValidDate(dateString) {
    const parts = dateString.split('/');
    if (parts.length !== 3) return false;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;

    if (month < 1 || month > 12) return false;

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;

    return true;
}

function convertToISO(dateString) {
    const parts = dateString.split('/');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function checkExpiredDeadlines() {
    const expiredTargets = prayerTargets.filter(target => target.hasDeadline && isDateExpired(target.deadlineDate));
    if (expiredTargets.length > 0) {
        let message = 'Os seguintes alvos estão com prazo de validade vencido:\n';
        expiredTargets.forEach(target => {
            message += `- ${target.title}\n`;
        });
        alert(message);
    }
}
