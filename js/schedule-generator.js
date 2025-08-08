// ARQUIVO: schedule-generator.js 

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { exibirIndiceEquilibrio, renderEscalaEmCards, renderAnaliseConcentracao, renderizarFiltros, configurarDragAndDrop } from './ui.js';
import { checkMemberAvailability, saoCompativeis } from './availability.js';
import { calculateParticipationData } from './utils.js'; // <-- MUDANÇA: Importando a função de utilitário.

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
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // MUDANÇA: Lógica de peso agora usa a contagem do objeto de participação unificado.
    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome]?.total || 0;
        return Math.pow(0.5, count);
    });

    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    
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
    const analise = {};
    const turnosCulto = ['Quarta', 'Domingo Manhã', 'Domingo Noite'];

    turnosCulto.forEach(turno => {
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

        const resultadoContainer = document.getElementById('resultadoEscala');
        const balanceContainer = document.getElementById('balanceIndexContainer');
        const filtrosContainer = document.getElementById('escala-filtros');
        const diagnosticContainer = document.getElementById('diagnosticReportContainer');

        resultadoContainer.innerHTML = '';
        resultadoContainer.classList.remove('escala-container');
        filtrosContainer.innerHTML = '';
        diagnosticContainer.innerHTML = '';
        diagnosticContainer.style.display = 'none';
        balanceContainer.style.display = 'none';
        balanceContainer.onclick = null;

        const tipoEscalaSelecionado = document.querySelector('input[name="tipoEscala"]:checked').value;
        const gerarCultos = tipoEscalaSelecionado === 'cultos';
        const gerarSabado = tipoEscalaSelecionado === 'sabado';
        const gerarOração = tipoEscalaSelecionado === 'oracao';
        
        const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
        const mes = parseInt(document.getElementById('mesEscala').value);
        const ano = parseInt(document.getElementById('anoEscala').value);
        
        // MUDANÇA: A inicialização da contagem de participação é removida daqui.

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

        // MUDANÇA: A lógica de seleção agora depende de uma contagem externa temporária, que será recalculada.
        let tempParticipationData = calculateParticipationData([], membros); // Inicia com contagem zerada.

        dias.forEach(dia => {
            const membrosDisponiveis = membros.filter(m => {
                const status = checkMemberAvailability(m, dia.tipo, dia.data);
                return status.type === 'disponivel';
            });
            
            const qtdNecessaria = (dia.tipo === 'Oração no WhatsApp' || dia.tipo === 'Sábado') ? 1 : quantidadeCultos;
            
            if (membrosDisponiveis.length >= qtdNecessaria) {
                let selecionados = [];
                if (qtdNecessaria === 1) {
                    selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, tempParticipationData);
                } else {
                    const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, tempParticipationData)[0];
                    if (primeiro) {
                        const poolParaSegundo = membrosDisponiveis.filter(m => m.nome !== primeiro.nome);
                        const membrosCompatíveis = poolParaSegundo.filter(m => saoCompativeis(m, primeiro));
                        const poolFinal = membrosCompatíveis.length > 0 ? membrosCompatíveis : poolParaSegundo;
                        const segundo = selecionarMembrosComAleatoriedade(poolFinal, 1, tempParticipationData)[0];
                        
                        if (segundo) selecionados = [primeiro, segundo];
                    }
                }

                if (selecionados.length === qtdNecessaria) {
                    dia.selecionados = selecionados;
                    // Atualiza a contagem temporária para a próxima iteração do loop.
                    selecionados.forEach(m => { tempParticipationData[m.nome].total++; });
                }
            }
        });
        
        // MUDANÇA: A contagem de participação final e oficial é calculada aqui, de forma centralizada.
        const justificationData = calculateParticipationData(dias, membros);

        renderEscalaEmCards(dias);
        renderizarFiltros(dias, analisarConcentracao(dias));
        configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes);
        exibirIndiceEquilibrio(justificationData);
        
        if (gerarCultos) {
            renderAnaliseConcentracao('all'); 
            
            if (balanceContainer) {
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