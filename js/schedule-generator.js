// ARQUIVO: schedule-generator.js

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { exibirIndiceEquilibrio, renderEscalaEmCards, renderAnaliseConcentracao, renderizarFiltros, configurarDragAndDrop, showToast } from './ui.js';
import { checkMemberAvailability, saoCompativeis } from './availability.js';

// Configurações Globais do Gerador
const CONFIG_GERADOR = {
    LIMITE_DISCREPANCIA: 2, // Diferença máxima permitida entre quem tem mais e quem tem menos
    TURNOS_CULTO: ['Quarta', 'Domingo Manhã', 'Domingo Noite'] // Turnos que contam para fadiga
};

function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) { return i; }
    }
    return weights.length - 1;
}

function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length === 0) return [];

    // Sistema de pesos inverso: quanto mais participações, menor a chance
    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome]?.participations || 0;
        return Math.pow(0.5, count);
    });

    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    
    // Se pesos zerados ou muito baixos, fallback para random simples
    if (somaPesos === 0) {
        const selecionados = [];
        const disponiveis = [...membrosDisponiveis];
        while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
            const i = Math.floor(Math.random() * disponiveis.length);
            selecionados.push(disponiveis.splice(i, 1)[0]);
        }
        return selecionados;
    }

    const pesosNormalizados = pesos.map(p => p / somaPesos);
    const selecionados = [];
    const disponiveis = [...membrosDisponiveis];
    let pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indiceSorteado = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indiceSorteado, 1)[0];
        
        // Remove peso usado e re-normaliza
        pesosTemp.splice(indiceSorteado, 1);
        const somaPesosTemp = pesosTemp.reduce((sum, p) => sum + p, 0);
        if (somaPesosTemp > 0) {
            pesosTemp = pesosTemp.map(p => p / somaPesosTemp);
        }

        selecionados.push(membroSelecionado);
    }
    return selecionados;
}

function analisarConcentracao(diasGerados) {
    // Função auxiliar mantida para compatibilidade com UI
    const analise = {};
    CONFIG_GERADOR.TURNOS_CULTO.forEach(turno => {
        const membrosDoTurno = [];
        let totalParticipacoesNoTurno = 0;
        let membrosDisponiveisCount = 0;

        membros.forEach(membro => {
            const status = checkMemberAvailability(membro, turno, null);
            if (status.type === 'disponivel') {
                membrosDisponiveisCount++;
            }
            const participacoes = diasGerados.filter(d => d.tipo === turno && d.selecionados.some(s => s.nome === membro.nome)).length;
            totalParticipacoesNoTurno += participacoes;

            membrosDoTurno.push({
                nome: membro.nome,
                participacoes: participacoes,
                status: status
            });
        });

        analise[turno] = {
            totalParticipacoesNoTurno: totalParticipacoesNoTurno,
            membrosDisponiveis: membrosDisponiveisCount,
            membrosDoTurno: membrosDoTurno.sort((a, b) => b.participacoes - a.participacoes)
        };
    });
    return analise;
}

export function setupGeradorEscala() {
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();

        // Limpeza da UI
        const resultadoContainer = document.getElementById('resultadoEscala');
        const balanceContainer = document.getElementById('balanceIndexContainer');
        const filtrosContainer = document.getElementById('escala-filtros');
        const diagnosticContainer = document.getElementById('diagnosticReportContainer');

        if(resultadoContainer) {
            resultadoContainer.innerHTML = '';
            resultadoContainer.classList.remove('escala-container');
        }
        if(filtrosContainer) filtrosContainer.innerHTML = '';
        if(diagnosticContainer) {
            diagnosticContainer.innerHTML = '';
            diagnosticContainer.style.display = 'none';
        }
        if(balanceContainer) {
            balanceContainer.style.display = 'none';
            balanceContainer.onclick = null;
        }

        // Parâmetros do Form
        const tipoEscalaSelecionado = document.querySelector('input[name="tipoEscala"]:checked').value;
        const gerarCultos = tipoEscalaSelecionado === 'cultos';
        const gerarSabado = tipoEscalaSelecionado === 'sabado';
        const gerarOração = tipoEscalaSelecionado === 'oracao';
        
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);

        // --- NOVA LÓGICA: CÁLCULO DE INTERVALO PROPORCIONAL PARA WHATSAPP ---
        let gapDinamicoWhatsApp = 0;
        if (gerarOração) {
            // Conta membros aptos (não suspensos do WhatsApp)
            const membrosAptosWhatsApp = membros.filter(m => !m.suspensao.whatsapp).length;
            
            // Fator 0.6 (60% da equipe): Garante descanso proporcional sem travar a escala
            // Math.max(0, ...) garante segurança contra números negativos
            gapDinamicoWhatsApp = Math.max(0, Math.floor(membrosAptosWhatsApp * 0.6));
            
            // MELHORIA UX: Feedback visual sobre o intervalo calculado
            if (gapDinamicoWhatsApp > 0) {
                showToast(`Intervalo de descanso para WhatsApp ajustado para ${gapDinamicoWhatsApp} dias (baseado em ${membrosAptosWhatsApp} membros ativos).`, 'info');
            } else {
                showToast('Atenção: Equipe de WhatsApp muito pequena para aplicar intervalos de descanso.', 'warning');
            }
        }
        // ----------------------------------------------------------------------

        // Inicializa contadores
        const justificationData = {};
        membros.forEach(m => {
            justificationData[m.nome] = { participations: 0 };
        });

        // 1. Cria a estrutura dos dias (Skeleton)
        const dias = [];
        const inicio = new Date(ano, mes, 1);
        const fim = new Date(ano, mes + 1, 0);
        let uniqueIdCounter = 0;

        for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
            const diaSemana = d.getDay();
            const diaInfoBase = { data: new Date(d), selecionados: [], id: `dia-${uniqueIdCounter++}` };

            if (gerarCultos) {
                if (diaSemana === 3) dias.push({ ...diaInfoBase, tipo: 'Quarta' });
                if (diaSemana === 0) {
                    dias.push({ ...diaInfoBase, tipo: 'Domingo Manhã' });
                    dias.push({ data: new Date(d), selecionados: [], id: `dia-${uniqueIdCounter++}`, tipo: 'Domingo Noite' });
                }
            }
            if (gerarSabado && diaSemana === 6) dias.push({ ...diaInfoBase, tipo: 'Sábado' });
            if (gerarOração) dias.push({ ...diaInfoBase, tipo: 'Oração no WhatsApp' });
        }

        // 2. Processamento Sequencial (Dia a Dia)
        dias.forEach((dia, indexDiaAtual) => {
            
            // A. Filtro Base: Disponibilidade (Suspensões, Férias, Regras Permanentes)
            let membrosPool = membros.filter(m => {
                const status = checkMemberAvailability(m, dia.tipo, dia.data);
                return status.type === 'disponivel';
            });

            // B. Filtro de Discrepância (Equilíbrio)
            // Calcula o mínimo de participações atual no grupo
            const minParticipacoesGlobal = Math.min(...Object.values(justificationData).map(d => d.participations));
            
            membrosPool = membrosPool.filter(m => {
                const partsAtuais = justificationData[m.nome].participations;
                // Só mantém quem não estourou a diferença permitida em relação ao mínimo
                return (partsAtuais - minParticipacoesGlobal) <= CONFIG_GERADOR.LIMITE_DISCREPANCIA;
            });

            // C. Filtro de Fadiga (Olhar para trás - i-1, i-2) - Apenas para CULTOS
            // Lógica: Se o membro esteve nos 2 últimos turnos de culto, bloqueia neste.
            if (CONFIG_GERADOR.TURNOS_CULTO.includes(dia.tipo)) {
                // Recupera apenas os dias anteriores que também são cultos
                const historicoCultos = dias
                    .slice(0, indexDiaAtual) // Pega dias anteriores ao atual
                    .filter(d => CONFIG_GERADOR.TURNOS_CULTO.includes(d.tipo)); // Apenas cultos

                if (historicoCultos.length >= 2) {
                    const ultimoCulto = historicoCultos[historicoCultos.length - 1];
                    const penultimoCulto = historicoCultos[historicoCultos.length - 2];

                    membrosPool = membrosPool.filter(m => {
                        const estavaUltimo = ultimoCulto.selecionados.some(s => s.nome === m.nome);
                        const estavaPenultimo = penultimoCulto.selecionados.some(s => s.nome === m.nome);

                        // Se estava nos dois anteriores, remove do pool (bloqueio de sequência de 3)
                        if (estavaUltimo && estavaPenultimo) {
                            return false; 
                        }
                        return true;
                    });
                }
            }

            // --- NOVO FILTRO: Intervalo Proporcional (Apenas para WHATSAPP) ---
            if (dia.tipo === 'Oração no WhatsApp' && gapDinamicoWhatsApp > 0) {
                membrosPool = membrosPool.filter(m => {
                    // Define janela de "respiro" baseada no cálculo proporcional
                    // Math.max(0, ...) impede acesso a índices negativos no início do mês
                    const diasAnterioresRecentes = dias.slice(Math.max(0, indexDiaAtual - gapDinamicoWhatsApp), indexDiaAtual);
                    
                    // Verifica se o membro trabalhou no WhatsApp nessa janela
                    const foiEscaladoRecentemente = diasAnterioresRecentes.some(dAnterior => 
                        dAnterior.tipo === 'Oração no WhatsApp' && 
                        dAnterior.selecionados.some(selecionado => selecionado.nome === m.nome)
                    );

                    // Mantém no pool apenas se NÃO foi escalado recentemente
                    return !foiEscaladoRecentemente;
                });
            }
            // ------------------------------------------------------------------

            // D. Seleção Final
            const qtdNecessaria = (dia.tipo === 'Oração no WhatsApp' || dia.tipo === 'Sábado') ? 1 : quantidadeCultos;
            let selecionados = [];

            // Se temos gente suficiente após todos os filtros
            if (membrosPool.length >= qtdNecessaria) {
                if (qtdNecessaria === 1) {
                    selecionados = selecionarMembrosComAleatoriedade(membrosPool, 1, justificationData);
                } else {
                    // Lógica de Duplas (Compatibilidade)
                    const primeiro = selecionarMembrosComAleatoriedade(membrosPool, 1, justificationData)[0];
                    if (primeiro) {
                        const poolParaSegundo = membrosPool.filter(m => m.nome !== primeiro.nome);
                        const membrosCompativeis = poolParaSegundo.filter(m => saoCompativeis(m, primeiro));
                        
                        const poolFinal = membrosCompativeis.length > 0 ? membrosCompativeis : poolParaSegundo;
                        const segundo = selecionarMembrosComAleatoriedade(poolFinal, 1, justificationData)[0];
                        
                        if (segundo) selecionados = [primeiro, segundo];
                    }
                }
            } else {
                // FALLBACK CRÍTICO: Não há membros suficientes respeitando as regras.
                // Tenta preencher o que der, o resto vira Vaga em Aberto.
                if (membrosPool.length > 0) {
                    selecionados = selecionarMembrosComAleatoriedade(membrosPool, membrosPool.length, justificationData);
                }
            }

            // Preenche buracos com Vagas em Aberto
            while (selecionados.length < qtdNecessaria) {
                selecionados.push({ nome: null, isVaga: true, genero: null });
            }

            // Atribui e Atualiza Estatísticas
            dia.selecionados = selecionados;
            selecionados.forEach(m => { 
                if (m.nome) justificationData[m.nome].participations++; 
            });
        });

        // 3. Renderização
        renderEscalaEmCards(dias);
        
        // Aplica o feedback visual de fadiga (laranja) caso alguma regra manual viole a lógica posteriormente
        // ou se o gerador falhou em evitar (edge cases)
        if (typeof window.aplicarFeedbackFadiga === 'function' || typeof aplicarFeedbackFadiga === 'function') {
            // Importado ou Global
            const func = window.aplicarFeedbackFadiga || aplicarFeedbackFadiga;
            if (func) func(dias); 
        }

        renderizarFiltros(dias, analisarConcentracao(dias));
        configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes);
        exibirIndiceEquilibrio(justificationData);
        
        if (gerarCultos) {
            renderAnaliseConcentracao('all'); 
            
            if (balanceContainer) {
                balanceContainer.style.display = 'block';
                balanceContainer.onclick = () => {
                    const reportElement = document.getElementById('diagnosticReportContainer');
                    if (reportElement && reportElement.style.display !== 'none') {
                        reportElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                };
            }
        }
    });
}
