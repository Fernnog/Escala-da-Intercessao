//
// MÓDULO DE AUTENTICAÇÃO (auth.js)
// Responsável pelo registro, login, logout e gerenciamento do estado de autenticação do usuário.
//

import { showTab, showToast } from './ui.js';

/**
 * Configura todos os listeners relacionados à autenticação.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {Function} onLoginSuccess - A função de callback a ser executada quando o login for bem-sucedido.
 */
export function setupAuthListeners(auth, onLoginSuccess) {
    const btnRegistro = document.getElementById('btnRegistro');
    const btnLogin = document.getElementById('btnLogin');
    const btnHeaderLogout = document.getElementById('header-logout-btn');

    // Listener para o botão de Registro
    if (btnRegistro) {
        btnRegistro.addEventListener('click', () => {
            const email = document.getElementById('emailAuth').value;
            const senha = document.getElementById('senhaAuth').value;
            if (!email || !senha) {
                showToast('Por favor, preencha e-mail e senha.', 'error');
                return;
            }
            auth.createUserWithEmailAndPassword(email, senha)
                .then(() => {
                    showToast('Usuário registrado com sucesso! Bem-vindo(a).', 'success');
                    // Não chama onLoginSuccess aqui, pois o onAuthStateChanged fará isso.
                })
                .catch((error) => {
                    showToast('Erro ao registrar: ' + error.message, 'error');
                });
        });
    }

    // Listener para o botão de Login
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            const email = document.getElementById('emailAuth').value;
            const senha = document.getElementById('senhaAuth').value;
            if (!email || !senha) {
                showToast('Por favor, preencha e-mail e senha.', 'error');
                return;
            }
            auth.signInWithEmailAndPassword(email, senha)
                .then(() => {
                    showToast('Login bem-sucedido!', 'success');
                    // Não chama onLoginSuccess aqui, pois o onAuthStateChanged fará isso.
                })
                .catch((error) => {
                    showToast('Erro ao fazer login: ' + error.message, 'error');
                });
        });
    }

    // Listener para o botão de Logout no cabeçalho
    if (btnHeaderLogout) {
        btnHeaderLogout.addEventListener('click', () => handleLogout(auth));
    }

    // Listener de Estado de Autenticação (o ponto central de controle)
    auth.onAuthStateChanged((user) => {
        // PRIORIDADE 1 & 2: Elementos atualizados para refletir o novo HTML e lógica de redirecionamento
        const userInfoDisplay = document.getElementById('user-info-display');
        const userEmailBadge = document.getElementById('user-email-badge'); // ID novo para o estilo de badge
        
        if (user) {
            // Usuário está logado
            if (userInfoDisplay) userInfoDisplay.style.display = 'flex';
            if (userEmailBadge) userEmailBadge.textContent = user.email;
            
            showTab('cadastro');
            onLoginSuccess(); // Dispara o carregamento de dados e atualização da UI
        } else {
            // Usuário está deslogado
            if (userInfoDisplay) userInfoDisplay.style.display = 'none';
            if (userEmailBadge) userEmailBadge.textContent = '';
            
            // PRIORIDADE 2: Redirecionamento forçado
            // Como removemos o botão de navegação, precisamos garantir que o usuário vá para a tela de login
            showTab('auth');
        }
    });
}

/**
 * Executa o processo de logout do usuário.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 */
export function handleLogout(auth) {
    auth.signOut().then(() => {
        showToast('Logout bem-sucedido!', 'success');
        // O onAuthStateChanged cuidará de limpar a UI do header e redirecionar
    }).catch((error) => {
        showToast('Erro ao fazer logout: ' + error.message, 'error');
    });
}
