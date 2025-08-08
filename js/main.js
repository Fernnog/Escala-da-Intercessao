// ARQUIVO: main.js (Versão Completa e Corrigida para Importação)

/**
 * PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO (main.js)
 * Responsabilidades:
 * 1. Importar todos os outros módulos.
 * 2. Esperar o carregamento da página (DOMContentLoaded).
 * 3. Inicializar o Firebase.
 * 4. Configurar todos os event listeners (cliques em botões, submissão de formulários).
 * 5. Orquestrar as chamadas entre os diferentes módulos (auth, data, ui, etc.).
 */

// ETAPA 1: As importações DEVEM estar no topo do arquivo, no escopo global.
import { setupAuthListeners, handleLogout } from './auth.js';
import { setupGeradorEscala } from './schedule-generator.js';
import { carregarDados, salvarDados, membros, restricoes, restricoesPermanentes } from './data-manager.js';
import {
    showTab,
    toggleConjuge,
    atualizarTodasAsListas,
    setupUiListeners,
    exportarEscalaXLSX,
    renderDisponibilidadeGeral,
    // Funções de UI necessárias para a nova funcionalidade de importação
    renderEscalaEmCards,
    configurarDragAndDrop,
    exibirIndiceEquilibrio,
    showToast
} from './ui.js';
import { setupSavedSchedulesListeners } from './saved-schedules-manager.js';
import {
    handleCadastroSubmit,
    handleRestricaoSubmit,
    handleRestricaoPermanenteSubmit,
    excluirMembro,
    excluirRestricao,
    excluirRestricaoPermanente,
    abrirModalSuspensao,
    salvarSuspensao,
    fecharModalSuspensao
} from './member-actions.js';


// ETAPA 2: O código que interage com a página é envolvido pelo listener DOMContentLoaded.
document.addEventListener('DOMContentLoaded', () => {

    // --- INICIALIZAÇÃO DO FIREBASE ---
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
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();

    // --- FUNÇÕES DE ORQUESTRAÇÃO ---

    /**
     * Função chamada após um login bem-sucedido.
     * Carrega os dados do usuário e atualiza toda a interface.
     */
    function onLoginSuccess() {
        carregarDados(auth, database, () => {
            atualizarTodasAsListas();
        });
    }

    /**
     * Disponibiliza funções dos módulos no escopo global (window) para que
     * possam ser chamadas pelos atributos `onclick` no HTML.
     */
    function exposeFunctionsToGlobalScope() {
        window.excluirMembro = (index) => excluirMembro(index, auth, database);
        window.excluirRestricao = (index) => excluirRestricao(index, auth, database);
        window.excluirRestricaoPermanente = (index) => excluirRestricaoPermanente(index, auth, database);
        window.abrirModalSuspensao = abrirModalSuspensao;
    }

    /**
     * Configura todos os event listeners da aplicação que não são
     * configurados dentro de outros módulos.
     */
    function setupEventListeners() {
        
        // --- Listeners da Barra de Navegação ---
        document.getElementById('nav-auth').addEventListener('click', () => showTab('auth'));
        document.getElementById('nav-cadastro').addEventListener('click', () => showTab('cadastro'));
        document.getElementById('nav-disponibilidade').addEventListener('click', () => {
            showTab('disponibilidade');
            renderDisponibilidadeGeral();
        });
        document.getElementById('nav-restricoes').addEventListener('click', () => showTab('restricoes'));
        document.getElementById('nav-restricoes-permanentes').addEventListener('click', () => showTab('restricoesPermanentes'));
        document.getElementById('nav-escala').addEventListener('click', () => showTab('escala'));

        // --- Listeners dos Botões de Ação Globais ---
        document.getElementById('btn-exportar-xlsx').addEventListener('click', exportarEscalaXLSX);
        document.getElementById('logout').addEventListener('click', () => handleLogout(auth));

        // --- Listeners do Modal de Suspensão ---
        document.getElementById('btn-salvar-suspensao').addEventListener('click', () => salvarSuspensao(auth, database));
        document.getElementById('btn-cancelar-suspensao').addEventListener('click', fecharModalSuspensao);

        // --- Listeners de Submissão de Formulários (Refatorados) ---
        document.getElementById('formCadastro').addEventListener('submit', (e) => {
            handleCadastroSubmit(e, auth, database);
        });

        document.getElementById('formRestricao').addEventListener('submit', (e) => {
            handleRestricaoSubmit(e, auth, database);
        });

        document.getElementById('formRestricaoPermanente').addEventListener('submit', (e) => {
            handleRestricaoPermanenteSubmit(e, auth, database);
        });

        // =====================================================================================
        // === INÍCIO DO CÓDIGO ADICIONADO: Lógica de Importação de Planilha (XLSX) ===
        // =====================================================================================
        const btnImportar = document.getElementById('btn-importar-xlsx');
        const inputImportar = document.getElementById('input-importar-xlsx');

        if (btnImportar) {
            btnImportar.addEventListener('click', () => {
                inputImportar.click(); // Aciona o input de arquivo escondido
            });
        }

        if (inputImportar) {
            inputImportar.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);

                        // Transforma os dados da planilha para a estrutura interna da aplicação
                        const diasTransformados = jsonData.map((row, index) => {
                            if (!row.Data || !row.Turno) return null;

                            const [day, month, year] = row.Data.split('/');
                            const dataObj = new Date(year, month - 1, day);

                            const selecionados = [];
                            let i = 1;
                            while (row[`Membro ${i}`]) {
                                const nomeMembro = row[`Membro ${i}`].trim();
                                const membroObj = membros.find(m => m.nome === nomeMembro);
                                if (membroObj) {
                                    selecionados.push(membroObj);
                                }
                                i++;
                            }
                            
                            return {
                                id: `importado-${index}`,
                                data: dataObj,
                                tipo: row.Turno,
                                selecionados: selecionados
                            };
                        }).filter(dia => dia !== null && !isNaN(dia.data.getTime()));

                        if (diasTransformados.length === 0) {
                            showToast('A planilha está vazia ou em formato incorreto.', 'error');
                            return;
                        }

                        const justificationDataRecalculado = {};
                        membros.forEach(m => {
                            justificationDataRecalculado[m.nome] = { participations: 0 };
                        });
                        diasTransformados.forEach(dia => {
                            dia.selecionados.forEach(membro => {
                                if (justificationDataRecalculado[membro.nome]) {
                                    justificationDataRecalculado[membro.nome].participations++;
                                }
                            });
                        });
                        
                        renderEscalaEmCards(diasTransformados);
                        configurarDragAndDrop(diasTransformados, justificationDataRecalculado, restricoes, restricoesPermanentes);
                        exibirIndiceEquilibrio(justificationDataRecalculado);

                        showToast('Escala importada com sucesso!', 'success');
                        document.getElementById('resultadoEscala').scrollIntoView({ behavior: 'smooth' });

                    } catch (error) {
                        console.error("Erro ao importar a planilha:", error);
                        showToast('Ocorreu um erro ao ler o arquivo. Verifique o formato.', 'error');
                    }
                };
                reader.readAsArrayBuffer(file);
                
                event.target.value = '';
            });
        }
        // ===================================================================================
        // === FIM DO CÓDIGO ADICIONADO ===
        // ===================================================================================

    }

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    setupAuthListeners(auth, onLoginSuccess);
    setupGeradorEscala();
    setupUiListeners();
    setupEventListeners();
    setupSavedSchedulesListeners(auth, database);
    exposeFunctionsToGlobalScope();
});
