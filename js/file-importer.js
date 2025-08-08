// js/file-importer.js (Versão Final com Validador de Nomes)

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import {
    renderEscalaEmCards,
    configurarDragAndDrop,
    exibirIndiceEquilibrio,
    showToast,
    renderAnaliseConcentracao,
    renderizarFiltros,
    openNameValidationModal, // Função da UI para abrir o novo modal
    closeNameValidationModal
} from './ui.js';
import { calculateParticipationData, getLevenshteinDistance } from './utils.js';

/**
 * Lida com um nome não encontrado durante a importação.
 * Abre um modal para o usuário decidir como proceder.
 * @param {string} unknownName - O nome não encontrado na planilha.
 * @param {string|null} suggestion - A sugestão de nome mais próxima, se houver.
 * @returns {Promise<object|null>} Uma promessa que resolve com o objeto de membro corrigido ou null se ignorado.
 */
function handleUnknownName(unknownName, suggestion) {
    return new Promise((resolve) => {
        openNameValidationModal(unknownName, suggestion, (correctedName) => {
            if (correctedName) {
                const membroCorrigido = membros.find(m => m.nome === correctedName);
                resolve(membroCorrigido);
            } else {
                resolve(null); // Usuário escolheu ignorar
            }
        });
    });
}

export function setupXLSXImporter() {
    const btnImportar = document.getElementById('btn-importar-xlsx');
    const inputImportar = document.getElementById('input-importar-xlsx');

    if (!btnImportar || !inputImportar) return;

    btnImportar.addEventListener('click', () => inputImportar.click());

    inputImportar.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        // A função de onload agora é assíncrona para aguardar a interação do usuário no modal
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const diasTransformados = [];
                let importCancelled = false;

                // Processa cada linha da planilha de forma assíncrona
                for (const [index, row] of jsonData.entries()) {
                    if (importCancelled) break;
                    if (!row.Data || !row.Turno) continue;

                    const [day, month, year] = row.Data.split('/');
                    const dataObj = new Date(year, month - 1, day);

                    const selecionados = [];
                    let i = 1;
                    while (row[`Membro ${i}`]) {
                        const nomeMembroPlanilha = row[`Membro ${i}`].trim();
                        let membroObj = membros.find(m => m.nome.toLowerCase() === nomeMembroPlanilha.toLowerCase());

                        if (!membroObj) {
                            // Lógica de validação de nome
                            let bestMatch = null;
                            let minDistance = 4; // Limite de distância para uma sugestão ser considerada válida

                            membros.forEach(m => {
                                const distance = getLevenshteinDistance(m.nome.toLowerCase(), nomeMembroPlanilha.toLowerCase());
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    bestMatch = m.nome;
                                }
                            });

                            const correctedMember = await handleUnknownName(nomeMembroPlanilha, bestMatch);
                            if (correctedMember) {
                                membroObj = correctedMember;
                            } else {
                                const userDecision = await openNameValidationModal(nomeMembroPlanilha, bestMatch);
                                if (userDecision.action === 'confirm' && userDecision.name) {
                                    membroObj = membros.find(m => m.nome === userDecision.name);
                                } else if (userDecision.action === 'cancel') {
                                    importCancelled = true;
                                    showToast('Importação cancelada pelo usuário.', 'warning');
                                    break; // Sai do loop de membros
                                }
                                // Se for 'ignore', membroObj continua nulo e o membro é pulado
                            }
                        }

                        if (membroObj) {
                            selecionados.push(membroObj);
                        }
                        i++;
                    }
                    
                    if (importCancelled) break; // Sai do loop de linhas

                    diasTransformados.push({
                        id: `importado-${index}`,
                        data: dataObj,
                        tipo: row.Turno,
                        selecionados: selecionados
                    });
                }
                
                if (importCancelled) {
                    closeNameValidationModal();
                    return; // Aborta o resto da função
                }

                if (diasTransformados.length === 0) {
                    showToast('A planilha está vazia, em formato incorreto ou nenhum membro foi validado.', 'error');
                    return;
                }

                // 1. MELHORIA DE ARQUITETURA: Usa a função centralizada
                const justificationDataRecalculado = calculateParticipationData(diasTransformados, membros);
                
                // 2. RENDERIZAÇÃO DA UI
                renderEscalaEmCards(diasTransformados);
                configurarDragAndDrop(diasTransformados, justificationDataRecalculado, restricoes, restricoesPermanentes);
                exibirIndiceEquilibrio(justificationDataRecalculado);

                // 3. CORREÇÃO PRINCIPAL: Renderiza os componentes de análise que faltavam
                renderizarFiltros(diasTransformados);
                renderAnaliseConcentracao('all');

                showToast('Escala importada e validada com sucesso!', 'success');
                
                // 4. MELHORIA DE UX: Rola a tela para o resultado
                document.getElementById('resultadoEscala').scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error("Erro ao importar a planilha:", error);
                showToast('Ocorreu um erro ao ler o arquivo. Verifique o formato.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        
        // Limpa o valor do input para permitir a seleção do mesmo arquivo novamente
        event.target.value = '';
    });
}
