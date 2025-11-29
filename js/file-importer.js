// js/file-importer.js

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { 
    renderEscalaEmCards, 
    configurarDragAndDrop, 
    exibirIndiceEquilibrio, 
    showToast, 
    renderAnaliseConcentracao // [Prioridade 1] Importado para atualizar estatísticas
} from './ui.js';
import { getLevenshteinDistance } from './utils.js'; // [Prioridade 2] Importado para Fuzzy Matching

export function setupXLSXImporter() {
    const btnImportar = document.getElementById('btn-importar-xlsx');
    const inputImportar = document.getElementById('input-importar-xlsx');

    if (!btnImportar || !inputImportar) {
        return; // Elementos não existem, não faz nada.
    }

    btnImportar.addEventListener('click', () => {
        inputImportar.click(); // Aciona o input de arquivo escondido
    });

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

                // Variável para rastrear correções de nomes feitas automaticamente
                let correcoesRealizadas = 0;

                // Transforma os dados da planilha para a estrutura interna da aplicação
                const diasTransformados = jsonData.map((row, index) => {
                    if (!row.Data || !row.Turno) return null;

                    const [day, month, year] = row.Data.split('/');
                    const dataObj = new Date(year, month - 1, day);

                    const selecionados = [];
                    let i = 1;
                    while (row[`Membro ${i}`]) {
                        const nomeRaw = row[`Membro ${i}`].trim();
                        
                        // [Prioridade 2] Lógica de Fuzzy Matching (Correção de Nomes)
                        // 1. Tenta encontrar exatamente
                        let membroObj = membros.find(m => m.nome.toLowerCase() === nomeRaw.toLowerCase());

                        // 2. Se não achar, tenta encontrar por aproximação (Levenshtein)
                        if (!membroObj) {
                            let melhorMatch = null;
                            let menorDistancia = Infinity;
                            
                            // Tolerância: aceita até 3 caracteres de diferença para nomes > 4 letras
                            const tolerancia = nomeRaw.length > 4 ? 3 : 1; 

                            membros.forEach(m => {
                                const dist = getLevenshteinDistance(m.nome.toLowerCase(), nomeRaw.toLowerCase());
                                if (dist < menorDistancia) {
                                    menorDistancia = dist;
                                    melhorMatch = m;
                                }
                            });

                            if (menorDistancia <= tolerancia && melhorMatch) {
                                membroObj = melhorMatch;
                                correcoesRealizadas++;
                                console.log(`[Importação] Nome corrigido: "${nomeRaw}" -> "${melhorMatch.nome}"`);
                            }
                        }

                        // 3. Se encontrou (exato ou aproximado), adiciona. 
                        // Se não, cria um objeto "convidado" temporário para não quebrar a visualização.
                        if (membroObj) {
                            selecionados.push(membroObj);
                        } else {
                            // Mantém como convidado/externo se não achar correspondência
                            selecionados.push({
                                nome: nomeRaw,
                                genero: 'X',
                                isConvidado: true
                            });
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

                // Recalcula contagem para o índice de equilíbrio
                const justificationDataRecalculado = {};
                membros.forEach(m => {
                    justificationDataRecalculado[m.nome] = { participations: 0 };
                });
                diasTransformados.forEach(dia => {
                    dia.selecionados.forEach(membro => {
                        // Só conta se for membro cadastrado (não convidado)
                        if (membro && !membro.isConvidado && justificationDataRecalculado[membro.nome]) {
                            justificationDataRecalculado[membro.nome].participations++;
                        }
                    });
                });
                
                // Renderizações de UI
                renderEscalaEmCards(diasTransformados);
                configurarDragAndDrop(diasTransformados, justificationDataRecalculado, restricoes, restricoesPermanentes);
                exibirIndiceEquilibrio(justificationDataRecalculado);

                // [Prioridade 1] Força a atualização da tabela de análise de turnos/subtópicos
                renderAnaliseConcentracao('all');

                // [Prioridade 3] Garante que o container de relatório esteja visível para feedback imediato
                const balanceContainer = document.getElementById('balanceIndexContainer');
                if (balanceContainer) {
                    balanceContainer.style.display = 'block';
                    // Opcional: Rolar até o relatório se desejar forçar a visão
                    // const reportContainer = document.getElementById('diagnosticReportContainer');
                    // if (reportContainer) reportContainer.scrollIntoView({ behavior: 'smooth' });
                }

                // Feedback ao usuário
                let msgSucesso = 'Escala importada com sucesso!';
                if (correcoesRealizadas > 0) {
                    msgSucesso += ` (${correcoesRealizadas} nomes corrigidos automaticamente)`;
                }
                showToast(msgSucesso, 'success');
                
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