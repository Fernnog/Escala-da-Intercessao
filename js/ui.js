// js/ui.js

import { membros, restricoes, restricoesPermanentes, escalasSalvas } from './data-manager.js';
import { saoCompativeis, checkMemberAvailability } from './availability.js';

// =========================================================
// === SEÇÃO DE CONFIGURAÇÃO E ESTADO ===
// =========================================================

const VISUAL_CONFIG = {
    turnos: {
        'Quarta':              { cardClass: 'turno-quarta', indicatorClass: 'indicator-quarta' },
        'Domingo Manhã':       { cardClass: 'turno-domingo-manha', indicatorClass: 'indicator-domingo-manha' },
        'Domingo Noite':       { cardClass: 'turno-domingo-noite', indicatorClass: 'indicator-domingo-noite' },
        'Sábado':              { cardClass: 'turno-sabado', indicatorClass: 'indicator-sabado' },
        'Oração no WhatsApp':  { cardClass: 'turno-oracao', indicatorClass: 'indicator-oracao' }
    },
    status: {
        disponivel:   { type: 'fa', value: 'fa-check-circle',   classe: 'status-disponivel',    titulo: 'Disponível para este turno' },
        permanente:   { type: 'emoji', value: '⛔',              classe: 'status-restrito-perm', titulo: 'Possui restrição permanente para este turno' },
        temporaria:   { type: 'emoji', value: '🚫',              classe: 'status-restrito-temp', titulo: 'Possui restrição temporária (ex: férias) neste dia' },
        suspenso:     { type: 'fa', value: 'fa-pause-circle',   classe: 'status-suspenso',      titulo: 'Está suspenso desta categoria de escala' }
    }
};

function getStatusIconHTML(statusConfig) {
    if (statusConfig.type === 'emoji') {
        return `<span class="status-icon status-emoji ${statusConfig.classe}" title="${statusConfig.titulo}">${statusConfig.value}</span>`;
    }
    return `<i class="fas ${statusConfig.value} status-icon ${statusConfig.classe}" title="${statusConfig.titulo}"></i>`;
}

// Armazenamento de estado para manipulação da UI
export let escalaAtual = [];
let justificationDataAtual = {};
let todasAsRestricoes = [];
let todasAsRestricoesPerm = [];
let diaSelecionadoId = null; // Para o painel lateral

// =========================================================
// === SEÇÃO DE FUNÇÕES DE ATUALIZAÇÃO DA UI (Listas) ===
// =========================================================

function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    if (!lista) return;
    
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    let maleCount = 0;
    let femaleCount = 0;
    
    lista.innerHTML = membros.map((m, index) => {
        if (m.genero === 'M') maleCount++;
        else if (m.genero === 'F') femaleCount++;
        const susp = m.suspensao;
        const isTotalmenteSuspenso = susp.cultos && susp.sabado && susp.whatsapp;
        const isParcialmenteSuspenso = !isTotalmenteSuspenso && (susp.cultos || susp.sabado || susp.whatsapp);
        let suspensaoTitle = '';
        if (isParcialmenteSuspenso) {
            let suspensoDe = [];
            if(susp.cultos) suspensoDe.push('Cultos');
            if(susp.sabado) suspensoDe.push('Sábado');
            if(susp.whatsapp) suspensoDe.push('WhatsApp');
            suspensaoTitle = `Suspenso de: ${suspensoDe.join(', ')}`;
        } else if (isTotalmenteSuspenso) {
            suspensaoTitle = 'Suspenso de todas as atividades.';
        }
        const genderSymbol = m.genero === 'M' ? '♂️' : '♀️';
        return `
            <li class="${isTotalmenteSuspenso ? 'suspended-member' : ''}">
                <div>
                    <span class="gender-icon gender-${m.genero === 'M' ? 'male' : 'female'}">${genderSymbol}</span>
                    <span class="member-name ${isTotalmenteSuspenso ? 'suspended-text' : ''}">
                        ${m.nome}
                        ${(isParcialmenteSuspenso || isTotalmenteSuspenso) ? `<i class="fas fa-pause-circle" title="${suspensaoTitle}"></i>` : ''}
                    </span>
                </div>
                <div class="member-details">
                    ${m.conjuge ? `<span class="spouse-info">- Cônjuge: ${m.conjuge}</span>` : ''}
                </div>
                <div>
                    <button class="secondary-button" onclick="window.abrirModalSuspensao(${index})">Gerenciar Suspensão</button>
                    <button onclick="window.excluirMembro(${index})">Excluir</button>
                </div>
            </li>`;
    }).join('');
    
    const elMale = document.getElementById('maleCount');
    const elFemale = document.getElementById('femaleCount');
    const elTotal = document.getElementById('totalCount');
    
    if(elMale) elMale.textContent = maleCount;
    if(elFemale) elFemale.textContent = femaleCount;
    if(elTotal) elTotal.textContent = membros.length;
}

function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    selects.forEach(select => {
        if(select) {
            select.innerHTML = '<option value="">Selecione um membro</option>' +
                membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
        }
    });
}

function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    if(!lista) return;
    restricoes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${new Date(r.inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${new Date(r.fim).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
        <button onclick="window.excluirRestricao(${index})">Excluir</button></li>`).join('');
}

function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    if(!lista) return;
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button onclick="window.excluirRestricaoPermanente(${index})">Excluir</button></li>`).join('');
}

function atualizarListaEscalasSalvas() {
    const lista = document.getElementById('listaEscalasSalvas');
    if (!lista) return;

    escalasSalvas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    
    lista.innerHTML = escalasSalvas.map(escala => `
        <li data-id="${escala.id}">
            <span>${escala.nome}</span>
            <div>
                <button class="secondary-button" data-action="load">Carregar</button>
                <button class="secondary-button" data-action="rename">Renomear</button>
                <button data-action="delete">Excluir</button>
            </div>
        </li>
    `).join('');
}

export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
    atualizarListaEscalasSalvas();
}

export function abrirModalAcaoEscala(action, escalaId = null, escalaNome = '') {
    const modal = document.getElementById('escalaActionModal');
    const title = document.getElementById('escalaModalTitle');
    const body = document.getElementById('escalaModalBody');
    document.getElementById('escalaModalAction').value = action;
    document.getElementById('escalaModalId').value = escalaId;

    if (action === 'save' || action === 'rename') {
        title.textContent = action === 'save' ? 'Salvar Escala' : 'Renomear Escala';
        const defaultName = (action === 'save')
            ? `Escala de ${new Date().toLocaleDateString('pt-BR')}`
            : escalaNome;
        body.innerHTML = `
            <div class="input-group">
                <input type="text" id="escalaModalInputName" value="${defaultName}" required placeholder=" ">
                <label for="escalaModalInputName">Nome da Escala</label>
            </div>`;
    } else if (action === 'delete') {
        title.textContent = 'Confirmar Exclusão';
        body.innerHTML = `<p>Você tem certeza que deseja excluir a escala "<strong>${escalaNome}</strong>"? Esta ação não pode ser desfeita.</p>`;
    }

    modal.style.display = 'flex';
}

export function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

export function toggleConjuge() {
    const conjugeField = document.getElementById('conjugeField');
    const conjugeParticipa = document.getElementById('conjugeParticipa');
    if(conjugeField && conjugeParticipa) {
        conjugeField.style.display = conjugeParticipa.checked ? 'block' : 'none';
    }
}

// === NOVO: Função para alternar o Modo Foco ===
export function toggleFocusMode() {
    document.body.classList.toggle('focus-mode');
    
    const isFocus = document.body.classList.contains('focus-mode');
    if (isFocus) {
        showToast('Modo Foco ativado. Pressione ESC para sair.', 'info');
    }
}

export function setupUiListeners() {
    const conjugeCheck = document.getElementById('conjugeParticipa');
    if(conjugeCheck) conjugeCheck.addEventListener('change', toggleConjuge);
    
    // Listeners Globais para Modais e Botões
    const btnFecharPainel = document.getElementById('btn-fechar-painel');
    if(btnFecharPainel) {
        btnFecharPainel.addEventListener('click', () => {
             document.getElementById('painelSuplentes').style.display = 'none';
             // Limpa seleção visual
             document.querySelectorAll('.escala-card').forEach(c => {
                 c.style.borderColor = '';
                 c.style.boxShadow = '';
                 c.style.transform = '';
             });
        });
    }

    // Input de busca no painel lateral
    const buscaInput = document.getElementById('buscaSuplente');
    if(buscaInput) {
        buscaInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.suplente-item');
            items.forEach(item => {
                const nome = item.dataset.nome.toLowerCase();
                item.style.display = nome.includes(termo) ? 'flex' : 'none';
            });
        });
    }
    
    // Botão Adicionar Externo
    const btnConfirmExterno = document.getElementById('btn-confirmar-externo');
    if(btnConfirmExterno) {
        btnConfirmExterno.addEventListener('click', window.confirmarAdicaoExterno);
    }

    // === NOVO: Listeners para o Modo Foco ===
    const btnEnterFocus = document.getElementById('btn-enter-focus');
    const btnExitFocus = document.getElementById('btn-exit-focus');

    if (btnEnterFocus) {
        btnEnterFocus.addEventListener('click', toggleFocusMode);
    }
    if (btnExitFocus) {
        btnExitFocus.addEventListener('click', toggleFocusMode);
    }

    // Listener para tecla ESC para sair do Modo Foco
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
            toggleFocusMode();
        }
    });
}

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
}

export function exportarEscalaXLSX() {
    const listaCards = document.querySelectorAll('.escala-card:not(.hidden)');
    if (listaCards.length === 0) {
        showToast('Não há escala visível para exportar. Verifique os filtros.', 'warning');
        return;
    }
    const wb = XLSX.utils.book_new();
    const headers = ['Data', 'Turno', 'Membro 1', 'Membro 2', 'Membro 3'];
    const dadosEscala = [headers];
    listaCards.forEach(card => {
        const data = card.querySelector('.escala-card__header span').textContent.trim();
        const tipo = card.querySelector('.escala-card__header h4').textContent.trim();
        const membrosNodes = card.querySelectorAll('.membro-card');
        const nomes = Array.from(membrosNodes)
            .filter(n => !n.classList.contains('vaga-aberta')) // Não exportar texto "Vaga em Aberto"
            .map(node => node.textContent.replace(' (Ext)', '').trim());
            
        const row = [data, tipo, ...nomes];
        while (row.length < headers.length) { row.push(''); }
        dadosEscala.push(row);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}

// =========================================================================
// === SEÇÃO DE FUNÇÕES DE RENDERIZAÇÃO DA ESCALA E ANÁLISE ===
// =========================================================================

function _analisarConcentracao(diasGerados) {
    const analise = {};
    const turnosCulto = ['Quarta', 'Domingo Manhã', 'Domingo Noite'];

    turnosCulto.forEach(turno => {
        const membrosDoTurno = [];
        let totalParticipacoesNoTurno = 0;
        let membrosDisponiveisCount = 0;

        membros.forEach(membro => {
            let isDisponivel = true;
            let status = { type: 'disponivel' };
            
            if (membro.suspensao.cultos) {
                isDisponivel = false;
                status = { type: 'suspenso' };
            } else if (restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === turno)) {
                status = { type: 'permanente' };
                isDisponivel = false;
            }
            
            if (isDisponivel) {
                membrosDisponiveisCount++;
            }

            // Conta participações (ignora vagas e convidados na contagem estatística)
            const participacoes = diasGerados.filter(d => 
                d.tipo === turno && 
                d.selecionados.some(s => s.nome === membro.nome && !s.isVaga && !s.isConvidado)
            ).length;
            
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

export function renderAnaliseConcentracao(filtro = 'all') {
    const container = document.getElementById('diagnosticReportContainer');
    if (!container) return;

    const analise = _analisarConcentracao(escalaAtual);
    let contentHTML = '';

    if (filtro === 'all') {
        const participacoesGlobais = {};
        membros.forEach(m => {
            participacoesGlobais[m.nome] = { total: 0 };
        });

        escalaAtual.forEach(dia => {
            dia.selecionados.forEach(membro => {
                if(membro.isVaga || membro.isConvidado || !membro.nome) return;
                
                const nomeMembro = membro.nome;
                if (participacoesGlobais[nomeMembro]) {
                    participacoesGlobais[nomeMembro].total++;
                    participacoesGlobais[nomeMembro][dia.tipo] = (participacoesGlobais[nomeMembro][dia.tipo] || 0) + 1;
                }
            });
        });

        const listaMembrosHtml = Object.entries(participacoesGlobais)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([nome, dados]) => {
                let maxTurnoCount = 0;
                const dadosTurnos = Object.entries(dados).filter(([key]) => key !== 'total');
                
                dadosTurnos.forEach(([, contagem]) => {
                    if (contagem > maxTurnoCount) maxTurnoCount = contagem;
                });

                const isUnbalanced = dados.total > 2 && (maxTurnoCount / dados.total > 0.7);
                const balanceAlertHtml = isUnbalanced 
                    ? `<i class="fas fa-exclamation-triangle balance-warning" title="Atenção: Participação concentrada em um único tipo de turno."></i>` 
                    : '';

                const breakdownHtml = dadosTurnos
                    .map(([turno, contagem]) => {
                        const indicatorClass = VISUAL_CONFIG.turnos[turno]?.indicatorClass || '';
                        return `<span class="turn-detail" title="${contagem} participação(ões) em: ${turno}">
                                    <span class="turn-indicator ${indicatorClass}"></span> ${contagem}
                                </span>`;
                    }).join('');

                return `<li>
                            <span>
                                <strong>${nome}:</strong> ${dados.total} vez(es)
                                ${balanceAlertHtml}
                            </span>
                            ${breakdownHtml ? `<div class="analysis-details">(${breakdownHtml})</div>` : ''}
                        </li>`;
            })
            .join('');

        contentHTML = `
            <div class="analysis-content">
                <div class="analise-turno-bloco">
                    <h5>Análise Global Consolidada</h5>
                    <p>Total de participações e detalhamento por turno. Membros externos e vagas vazias não contam para o equilíbrio.</p>
                    <ul>${listaMembrosHtml}</ul>
                </div>
            </div>`;

    } else {
        const turnosParaRenderizar = [filtro];
        contentHTML = turnosParaRenderizar
            .filter(turno => analise[turno])
            .map(turno => {
                const dados = analise[turno];
                const listaMembrosHtml = dados.membrosDoTurno.map(membro => {
                    const statusConfig = VISUAL_CONFIG.status[membro.status.type];
                    const statusIcon = getStatusIconHTML(statusConfig);
                    return `<li><span><strong>${membro.nome}:</strong> ${membro.participacoes} vez(es)</span>${statusIcon}</li>`;
                }).join('');
                return `<div class="analise-turno-bloco"><h5>Análise: ${turno}</h5><p>Total de participações: <strong>${dados.totalParticipacoesNoTurno}</strong> | Membros disponíveis: <strong>${dados.membrosDisponiveis}</strong></p><ul>${listaMembrosHtml || '<li>Nenhuma análise disponível.</li>'}</ul></div>`;
            }).join('');
        contentHTML = contentHTML ? `<div class="analysis-content">${contentHTML}</div>` : '';
    }

    container.innerHTML = contentHTML;
    container.style.display = contentHTML ? 'block' : 'none';
}

// === FUNÇÃO CRUCIAL: RENDERIZAR CARDS COM SUPORTE A VAGAS, CONVIDADOS E BOTÃO REMOVER ===
export function renderEscalaEmCards(dias) {
    const diasValidos = dias.filter(dia => dia && dia.data instanceof Date);
    escalaAtual = diasValidos;
    const container = document.getElementById('resultadoEscala');
    container.innerHTML = '';
    container.classList.add('escala-container');

    diasValidos.forEach(dia => {
        const turnoConfig = VISUAL_CONFIG.turnos[dia.tipo] || { cardClass: '' };
        
        // Adiciona onclick no card para abrir o painel lateral inteligente
        const cardHTML = `
            <div class="escala-card ${turnoConfig.cardClass}" data-id="${dia.id}" data-turno="${dia.tipo}" onclick="window.atualizarPainelSuplentes('${dia.id}')">
                <div class="escala-card__header">
                    <h4>${dia.tipo}</h4>
                    <span>${dia.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
                <div class="escala-card__body">
                    ${dia.selecionados.map((m, idx) => {
                        // Renderiza Vaga em Aberto (Vermelho)
                        if (m.isVaga || !m.nome) {
                            return `<div class="membro-card vaga-aberta" onclick="event.stopPropagation(); window.abrirModalConvidado('${dia.id}', ${idx})">
                                        <i class="fas fa-plus-circle"></i> Vaga Aberta
                                    </div>`;
                        }
                        
                        // Botão de remover membro (X)
                        const removeBtn = `<button class="card-remove-btn" onclick="event.stopPropagation(); window.limparVaga('${dia.id}', ${idx})" title="Remover da escala">
                                                <i class="fas fa-times"></i>
                                           </button>`;

                        // Renderiza Convidado (Roxo) - PRIORIDADE 2
                        if (m.isConvidado) {
                            return `<div class="membro-card convidado" draggable="true" data-nome="${m.nome}" data-externo="true">
                                        <i class="fas fa-user-tag" style="color: #6a1b9a; margin-right:5px;"></i> ${m.nome}
                                        ${removeBtn}
                                    </div>`;
                        }
                        
                        // Renderiza Membro Padrão com Feedback de Cônjuge (Prioridade 1)
                        const conjugeIcon = m.conjuge ? `<i class="fas fa-ring spouse-icon" title="Cônjuge: ${m.conjuge}"></i>` : '';

                        return `<div class="membro-card" draggable="true" data-nome="${m.nome}">
                                    ${conjugeIcon}${m.nome}
                                    ${removeBtn}
                                </div>`;
                    }).join('')}
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });

    // Aplica o feedback visual de Fadiga (Laranja) após a renderização
    aplicarFeedbackFadiga(diasValidos);

    // [MODIFICAÇÃO PRIORIDADE 1] Seleção Automática do Primeiro Dia para ativar o Painel
    if (diasValidos.length > 0) {
        setTimeout(() => {
            // Garante que a função está disponível e simula a seleção do primeiro dia
            if (typeof window.atualizarPainelSuplentes === 'function') {
                window.atualizarPainelSuplentes(diasValidos[0].id);
            }
        }, 100);
    }
}

// === FUNÇÃO DE FEEDBACK DE FADIGA (SEQUÊNCIA DE 3) ===
export function aplicarFeedbackFadiga(dias) {
    const cultos = dias.filter(d => ['Quarta', 'Domingo Manhã', 'Domingo Noite'].includes(d.tipo));
    
    // Começa do índice 2 (3º elemento) para olhar os 2 anteriores
    for (let i = 2; i < cultos.length; i++) {
        const atual = cultos[i];
        const anterior = cultos[i-1];
        const antepenultimo = cultos[i-2];

        atual.selecionados.forEach(membro => {
            if (!membro.nome || membro.isVaga || membro.isConvidado) return;

            const estavaAnt = anterior.selecionados.some(m => m.nome === membro.nome);
            const estavaAntepen = antepenultimo.selecionados.some(m => m.nome === membro.nome);

            if (estavaAnt && estavaAntepen) {
                const cardDiaEl = document.querySelector(`.escala-card[data-id="${atual.id}"]`);
                if (cardDiaEl) {
                    const membroEl = cardDiaEl.querySelector(`.membro-card[data-nome="${membro.nome}"]`);
                    if (membroEl) {
                        membroEl.classList.add('fadiga-alert');
                        membroEl.title = "Alerta: 3º turno consecutivo!";
                    }
                }
            }
        });
    }
}

export function exibirIndiceEquilibrio(justificationData) {
    const container = document.getElementById('balanceIndexContainer');
    if (!container) return;

    const counts = Object.values(justificationData).map(d => d.participations);
    if (counts.length === 0) {
        container.style.display = 'none';
        return;
    }

    const totalParticipations = counts.reduce((sum, count) => sum + count, 0);
    if (totalParticipations === 0) {
        container.style.display = 'none';
        return;
    }
    
    const mean = totalParticipations / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    let balancePercentage = Math.max(0, 100 - (stdDev / mean) * 100);
    balancePercentage = Math.min(100, balancePercentage);

    container.style.display = 'block';
    container.innerHTML = `
        <h4>Índice de Equilíbrio da Escala <small>(clique para ver o relatório)</small></h4>
        <div class="balance-bar-background">
            <div class="balance-bar-foreground" style="width: ${balancePercentage.toFixed(2)}%;">
                ${balancePercentage.toFixed(0)}%
            </div>
        </div>
    `;

    const bar = container.querySelector('.balance-bar-foreground');
    if (balancePercentage < 60) {
        bar.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)';
    } else if (balancePercentage < 85) {
        bar.style.background = 'linear-gradient(90deg, #ffc107, #ffda58)';
    } else {
        bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)';
    }
}

export function renderizarFiltros(dias) {
    const container = document.getElementById('escala-filtros');
    if (!container) return;
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    if (turnos.length <= 1) { container.innerHTML = ''; return; }
    container.innerHTML = `
        <button class="active" data-filter="all">Todos</button>
        ${turnos.map(turno => `<button data-filter="${turno}">${turno}</button>`).join('')}`;
    
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    newContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            newContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            const filtroSelecionado = e.target.dataset.filter;
            
            filtrarCards(filtroSelecionado);
            renderAnaliseConcentracao(filtroSelecionado);
        }
    });
}

function filtrarCards(filtro) {
    document.querySelectorAll('.escala-card').forEach(card => {
        card.classList.toggle('hidden', filtro !== 'all' && card.dataset.turno !== filtro);
    });
}

export function renderDisponibilidadeGeral() {
    const container = document.getElementById('disponibilidadeContainer');
    if (!container) return;

    const turnos = ['Quarta', 'Domingo Manhã', 'Domingo Noite', 'Sábado', 'Oração no WhatsApp'];
    
    let contentHTML = '';
    turnos.forEach(turno => {
        const listaDisponiveis = [];
        const listaIndisponiveis = [];

        membros.forEach(membro => {
            let status = { type: 'disponivel' };
            let isDisponivel = true;
            
            let suspensaoKey;
            if (turno === 'Sábado') suspensaoKey = 'sabado';
            else if (turno === 'Oração no WhatsApp') suspensaoKey = 'whatsapp';
            else suspensaoKey = 'cultos';

            if (membro.suspensao[suspensaoKey]) {
                status = { type: 'suspenso' };
                isDisponivel = false;
            } else if (restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === turno)) {
                status = { type: 'permanente' };
                isDisponivel = false;
            }

            const statusConfig = VISUAL_CONFIG.status[status.type];
            const statusIcon = getStatusIconHTML(statusConfig);
            const membroHTML = `<li><span>${membro.nome}</span>${statusIcon}</li>`;

            if (isDisponivel) {
                listaDisponiveis.push(membroHTML);
            } else {
                listaIndisponiveis.push(membroHTML);
            }
        });

        contentHTML += `
            <div class="disponibilidade-turno-bloco">
                <h5>Turno: ${turno}</h5>
                <div class="list-container">
                    <div class="list-wrapper disponiveis">
                        <h6>Disponíveis (${listaDisponiveis.length})</h6>
                        <ul>${listaDisponiveis.join('') || '<li>Nenhum membro disponível.</li>'}</ul>
                    </div>
                    <div class="list-wrapper indisponiveis">
                        <h6>Indisponíveis (${listaIndisponiveis.length})</h6>
                        <ul>${listaIndisponiveis.join('') || '<li>Nenhum membro indisponível.</li>'}</ul>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = contentHTML;
}

// =========================================================================
// === SEÇÃO PAINEL LATERAL INTELIGENTE & MODAIS ===
// =========================================================================

// Função global para ser chamada pelo onclick do Card
window.atualizarPainelSuplentes = function(cardId) {
    diaSelecionadoId = cardId;
    const dia = escalaAtual.find(d => d.id === cardId);
    if (!dia) return;

    const painel = document.getElementById('painelSuplentes');
    const lista = document.getElementById('listaSuplentes');
    const contexto = document.getElementById('painel-contexto');

    // [MODIFICAÇÃO UX] Feedback Visual de Seleção
    // 1. Limpa destaque de todos os cards
    document.querySelectorAll('.escala-card').forEach(c => {
        c.style.borderColor = '';
        c.style.boxShadow = '';
        c.style.transform = '';
        c.style.zIndex = '';
    });

    // 2. Aplica destaque ao card selecionado
    const cardAtivo = document.querySelector(`.escala-card[data-id="${cardId}"]`);
    if (cardAtivo) {
        // Estilos inline aplicados via JS para não depender de alteração no CSS
        cardAtivo.style.borderColor = '#4682b4'; 
        cardAtivo.style.boxShadow = '0 0 15px rgba(70, 130, 180, 0.4)';
        cardAtivo.style.transform = 'scale(1.02)';
        cardAtivo.style.zIndex = '5'; // Garante que fique sobre os outros no zoom
        cardAtivo.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    if(painel) painel.style.display = 'block';
    if(contexto) contexto.textContent = `Para: ${dia.tipo} (${dia.data.toLocaleDateString()})`;
    
    // Quem já está escalado neste dia?
    const escaladosNesteDia = dia.selecionados.map(s => s.nome).filter(n => n);
    
    // Ordenar sugestões: Menos participações primeiro
    const sugestoes = membros
        .filter(m => !escaladosNesteDia.includes(m.nome))
        .sort((a, b) => {
             const partsA = justificationDataAtual[a.nome] ? justificationDataAtual[a.nome].participations : 0;
             const partsB = justificationDataAtual[b.nome] ? justificationDataAtual[b.nome].participations : 0;
             return partsA - partsB;
        });

    if(lista) {
        lista.innerHTML = sugestoes.map(m => {
            const parts = justificationDataAtual[m.nome] ? justificationDataAtual[m.nome].participations : 0;
            
            // Lógica de Ícones EXATOS conforme legenda do rodapé (PRIORIDADE 3)
            const iconesStatus = [];
            let isRestrito = false;

            // 1. Suspensão
            let suspKey = 'cultos'; 
            if (dia.tipo === 'Sábado') suspKey = 'sabado';
            else if (dia.tipo === 'Oração no WhatsApp') suspKey = 'whatsapp';
            
            if (m.suspensao && m.suspensao[suspKey]) {
                iconesStatus.push('<i class="fas fa-pause-circle" style="color: #ffc107;" title="Suspenso"></i>');
                isRestrito = true;
            }

            // 2. Restrição Permanente
            if (todasAsRestricoesPerm.some(r => r.membro === m.nome && r.diaSemana === dia.tipo)) {
                iconesStatus.push('<span title="Restrição Permanente">⛔</span>');
                isRestrito = true;
            }

            // 3. Restrição Temporária (Férias)
            const diaAlvo = new Date(dia.data); diaAlvo.setHours(0,0,0,0);
            if (todasAsRestricoes.some(r => {
                const inicio = new Date(r.inicio); inicio.setHours(0,0,0,0);
                const fim = new Date(r.fim); fim.setHours(0,0,0,0);
                return r.membro === m.nome && diaAlvo >= inicio && diaAlvo <= fim;
            })) {
                iconesStatus.push('<span title="Restrição Temporária">🚫</span>');
                isRestrito = true;
            }

            // Se não tiver nenhuma restrição, ícone verde
            if (iconesStatus.length === 0) {
                iconesStatus.push('<i class="fas fa-check-circle" style="color:#28a745"></i>');
            }
            
            return `
                <li draggable="true" class="suplente-item ${isRestrito ? 'com-restricao' : ''}" data-nome="${m.nome}" title="${isRestrito ? 'Possui Restrições' : 'Disponível'}">
                    <span>
                        <span class="suplente-status-icons">${iconesStatus.join(' ')}</span>
                        ${m.nome}
                    </span>
                    <span class="suplente-badge ${parts <= 1 ? 'low-part' : ''}">${parts}x</span>
                </li>
            `;
        }).join('');
        
        // Re-atachar drag events para a nova lista
        setupDragParaSuplentes();
    }
};

function setupDragParaSuplentes() {
    const items = document.querySelectorAll('.suplente-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.nome);
            e.dataTransfer.setData('source-type', 'suplente'); // Marca que veio do painel
        });
    });
}

// === NOVO: Função para limpar uma vaga (Transformar membro em Vaga Aberta) - PRIORIDADE 2 ===
window.limparVaga = function(diaId, index) {
    if (!confirm("Tem certeza que deseja remover este membro da escala?")) return;

    const dia = escalaAtual.find(d => d.id === diaId);
    if (!dia || !dia.selecionados[index]) return;

    const membroRemovido = dia.selecionados[index];

    // Se for um membro oficial (não convidado e não vaga), decrementa estatística
    if (membroRemovido.nome && !membroRemovido.isConvidado && !membroRemovido.isVaga) {
        if (justificationDataAtual[membroRemovido.nome]) {
            justificationDataAtual[membroRemovido.nome].participations--;
        }
    }

    // Reseta o slot para Vaga Aberta
    dia.selecionados[index] = { nome: null, isVaga: true, genero: null };

    // Re-renderiza a UI
    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    
    // Atualiza estatísticas do painel lateral se estiver aberto
    if (diaSelecionadoId) window.atualizarPainelSuplentes(diaSelecionadoId);

    // Re-configura Drag & Drop para os novos elementos DOM
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);

    showToast('Membro removido da escala.', 'warning');
};

// Modais Globais
window.abrirModalConvidado = function(diaId, indiceVaga) {
    document.getElementById('modalNomeExterno').style.display = 'flex';
    document.getElementById('externoDiaId').value = diaId;
    document.getElementById('externoIndiceVaga').value = indiceVaga;
    document.getElementById('inputNomeExterno').value = '';
    document.getElementById('inputNomeExterno').focus();
};

window.confirmarAdicaoExterno = function() {
    const nome = document.getElementById('inputNomeExterno').value;
    const diaId = document.getElementById('externoDiaId').value;
    const idx = parseInt(document.getElementById('externoIndiceVaga').value);
    
    if(!nome) return;

    const dia = escalaAtual.find(d => d.id === diaId);
    if(dia && dia.selecionados[idx]) {
        dia.selecionados[idx] = { 
            nome: nome, 
            isConvidado: true,
            genero: 'X' 
        };
        renderEscalaEmCards(escalaAtual);
        exibirIndiceEquilibrio(justificationDataAtual);

        // ATUALIZA PAINEL LATERAL (Sincroniza os contadores)
        if (diaSelecionadoId) window.atualizarPainelSuplentes(diaSelecionadoId);

        // RECONECTA EVENTOS DE DRAG & DROP APÓS ATUALIZAÇÃO DOM
        configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);

        document.getElementById('modalNomeExterno').style.display = 'none';
        showToast(`Convidado ${nome} adicionado.`, 'success');
    }
};

// =========================================================================
// === SEÇÃO DE DRAG & DROP & TROCA MANUAL ===
// =========================================================================

// Helper para executar a troca fisicamente após validações
function _executarTroca(nomeArrastado, nomeAlvo, diaAlvo, indexAlvo, isFromSuplente) {
    const membroArrastadoObj = membros.find(m => m.nome === nomeArrastado);
    
    // Se veio de outra vaga da escala, precisamos remover de lá
    if (!isFromSuplente) {
        // Encontrar onde ele estava
        escalaAtual.forEach(d => {
            const idx = d.selecionados.findIndex(m => m.nome === nomeArrastado);
            if (idx > -1) {
                // Se estamos trocando um por outro
                if (nomeAlvo && !diaAlvo.selecionados[indexAlvo].isVaga) {
                     // Lógica de Swap simplificada: Quem sai volta pro banco
                     d.selecionados[idx] = { nome: null, isVaga: true };
                } else {
                     d.selecionados[idx] = { nome: null, isVaga: true };
                }
            }
        });
    }

    // Colocar no destino
    diaAlvo.selecionados[indexAlvo] = membroArrastadoObj;

    // Atualizar estatísticas
    if (justificationDataAtual[nomeArrastado]) justificationDataAtual[nomeArrastado].participations++;
    if (nomeAlvo && !diaAlvo.selecionados[indexAlvo].isVaga && justificationDataAtual[nomeAlvo]) {
        justificationDataAtual[nomeAlvo].participations--;
    }

    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    
    const filtroAtivo = document.querySelector('#escala-filtros button.active')?.dataset.filter || 'all';
    renderAnaliseConcentracao(filtroAtivo);

    // ATUALIZA PAINEL LATERAL (Sincroniza os contadores)
    if (diaSelecionadoId) window.atualizarPainelSuplentes(diaSelecionadoId);

    // RECONECTA EVENTOS DE DRAG & DROP APÓS ATUALIZAÇÃO DOM
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
    
    showToast('Alteração realizada com sucesso.', 'success');
}

function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId, sourceType) {
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaAlvo) return;
    
    // Indice do alvo
    let indexAlvo = -1;
    if (nomeAlvo) {
        // Se arrastou sobre um nome
        indexAlvo = diaAlvo.selecionados.findIndex(m => m.nome === nomeAlvo);
    } else {
        // Se arrastou sobre uma Vaga em Aberto (target class .vaga-aberta)
        indexAlvo = diaAlvo.selecionados.findIndex(m => m.isVaga);
    }
    
    if (indexAlvo === -1) return; // Não achou onde soltar

    // Validações
    const membroArrastadoObj = membros.find(m => m.nome === nomeArrastado);
    if (!membroArrastadoObj) return;

    if (diaAlvo.selecionados.some(m => m.nome === nomeArrastado)) {
        showToast(`${nomeArrastado} já está neste dia.`, 'warning');
        return;
    }

    const diaAlvoData = new Date(diaAlvo.data); diaAlvoData.setHours(0,0,0,0);
    const temRestricaoTemp = todasAsRestricoes.some(r => r.membro === nomeArrastado && diaAlvoData >= new Date(r.inicio) && diaAlvoData <= new Date(r.fim));
    const temRestricaoPerm = todasAsRestricoesPerm.some(r => r.membro === nomeArrastado && r.diaSemana === diaAlvo.tipo);
    const suspenso = checkMemberAvailability(membroArrastadoObj, diaAlvo.tipo).type === 'suspenso';

    const erros = [];
    if (temRestricaoTemp) erros.push("Restrição Temporária (Férias/Ausência)");
    if (temRestricaoPerm) erros.push("Restrição Permanente de Dia/Turno");
    if (suspenso) erros.push("Membro Suspenso");

    // Verificar compatibilidade com o parceiro (se houver)
    const outrosMembros = diaAlvo.selecionados.filter((m, i) => i !== indexAlvo && !m.isVaga && !m.isConvidado);
    for (const parceiro of outrosMembros) {
        if (!saoCompativeis(membroArrastadoObj, parceiro)) {
            erros.push(`Incompatível com ${parceiro.nome} (Gênero/Cônjuge)`);
        }
    }

    // SE HOUVER ERROS, MOSTRA TOAST E PERMITE TROCA (SEM MODAL)
    if (erros.length > 0) {
        _executarTroca(nomeArrastado, nomeAlvo, diaAlvo, indexAlvo, sourceType === 'suplente');
        const msgErro = erros.join(', ');
        showToast(`Alerta: ${msgErro}`, 'warning');
        return;
    }

    // Se não tem erro, executa direto
    _executarTroca(nomeArrastado, nomeAlvo, diaAlvo, indexAlvo, sourceType === 'suplente');
}

export function configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes) {
    escalaAtual = dias;
    justificationDataAtual = justificationData;
    todasAsRestricoes = restricoes;
    todasAsRestricoesPerm = restricoesPermanentes;

    // Delegate dragover/drop para o container, ou reatachar a cada render?
    // Como re-renderizamos tudo, reatachar é mais seguro para os elementos novos.
    
    const membrosCards = document.querySelectorAll('.membro-card, .vaga-aberta'); // Inclui vagas como drop targets
    
    membrosCards.forEach(card => {
        if (!card.classList.contains('vaga-aberta') && !card.classList.contains('convidado')) {
            card.addEventListener('dragstart', (e) => {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', e.target.dataset.nome);
                e.dataTransfer.setData('card-id', e.target.closest('.escala-card').dataset.id);
                e.dataTransfer.setData('source-type', 'escala');
            });
            card.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        }

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!e.target.classList.contains('dragging')) {
                e.target.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', (e) => {
            e.target.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            e.target.classList.remove('drag-over');
            
            const nomeArrastado = e.dataTransfer.getData('text/plain');
            const cardOrigemId = e.dataTransfer.getData('card-id');
            const sourceType = e.dataTransfer.getData('source-type');
            
            const nomeAlvo = e.target.dataset.nome || null; // Null se for vaga
            const cardAlvoId = e.target.closest('.escala-card').dataset.id;
            
            if (nomeArrastado === nomeAlvo) return;
            
            remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId, sourceType);
        });
    });
}
