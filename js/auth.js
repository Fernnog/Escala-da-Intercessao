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
        // Elementos do novo Header
        const userInfoDisplay = document.getElementById('user-info-display');
        const userEmailSpan = document.getElementById('user-email-span');
        
        if (user) {
            // Usuário está logado
            if (userInfoDisplay) userInfoDisplay.style.display = 'flex';
            if (userEmailSpan) userEmailSpan.textContent = user.email;
            
            showTab('cadastro');
            onLoginSuccess(); // Dispara o carregamento de dados e atualização da UI
        } else {
            // Usuário está deslogado
            if (userInfoDisplay) userInfoDisplay.style.display = 'none';
            if (userEmailSpan) userEmailSpan.textContent = '';
            
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
        // O onAuthStateChanged cuidará de limpar a UI do header
    }).catch((error) => {
        showToast('Erro ao fazer logout: ' + error.message, 'error');
    });
}
