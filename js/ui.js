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

export let escalaAtual = [];
let justificationDataAtual = {};
let todasAsRestricoes = [];
let todasAsRestricoesPerm = [];
let diaSelecionadoId = null;

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

export function toggleFocusMode() {
    document.body.classList.toggle('focus-mode');
    if (document.body.classList.contains('focus-mode')) {
        showToast('Modo Foco ativado. Pressione ESC para sair.', 'info');
    }
}

export function setupUiListeners() {
    const conjugeCheck = document.getElementById('conjugeParticipa');
    if(conjugeCheck) conjugeCheck.addEventListener('change', toggleConjuge);
    
    const btnFecharPainel = document.getElementById('btn-fechar-painel');
    if(btnFecharPainel) {
        btnFecharPainel.addEventListener('click', () => {
             document.getElementById('painelSuplentes').style.display = 'none';
             document.querySelectorAll('.escala-card').forEach(c => {
                 c.style.borderColor = '';
                 c.style.boxShadow = '';
                 c.style.transform = '';
             });
        });
    }

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
    
    const btnConfirmExterno = document.getElementById('btn-confirmar-externo');
    if(btnConfirmExterno) {
        btnConfirmExterno.addEventListener('click', window.confirmarAdicaoExterno);
    }

    const btnEnterFocus = document.getElementById('btn-enter-focus');
    const btnExitFocus = document.getElementById('btn-exit-focus');
    if (btnEnterFocus) btnEnterFocus.addEventListener('click', toggleFocusMode);
    if (btnExitFocus) btnExitFocus.addEventListener('click', toggleFocusMode);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
            toggleFocusMode();
        }
    });

    const btnForceSim = document.getElementById('btn-force-sim');
    if (btnForceSim) {
        btnForceSim.addEventListener('click', () => {
            const nomeArrastado = document.getElementById('forceNomeArrastado').value;
            const nomeAlvo = document.getElementById('forceNomeAlvo').value || null;
            const cardAlvoId = document.getElementById('forceCardAlvoId').value;
            const indexAlvo = parseInt(document.getElementById('forceIndexAlvo').value);
            const sourceType = document.getElementById('forceSourceType').value;
            const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
            if (diaAlvo) {
                _executarTroca(nomeArrastado, nomeAlvo, diaAlvo, indexAlvo, sourceType === 'suplente');
                showToast('Membro escalado manualmente (regra ignorada).', 'warning');
            }
            document.getElementById('modalConfirmacaoForce').style.display = 'none';
        });
    }
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
        showToast('Não há escala visível para exportar.', 'warning');
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
            .filter(n => !n.classList.contains('vaga-aberta'))
            .map(node => node.textContent.replace(' (Ext)', '').trim());
            
        const row = [data, tipo, ...nomes];
        while (row.length < headers.length) { row.push(''); }
        dadosEscala.push(row);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}

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
            if (isDisponivel) membrosDisponiveisCount++;
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
        membros.forEach(m => { participacoesGlobais[m.nome] = { total: 0 }; });
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
                dadosTurnos.forEach(([, contagem]) => { if (contagem > maxTurnoCount) maxTurnoCount = contagem; });
                const isUnbalanced = dados.total > 2 && (maxTurnoCount / dados.total > 0.7);
                const balanceAlertHtml = isUnbalanced ? `<i class="fas fa-exclamation-triangle balance-warning" title="Participação concentrada."></i>` : '';
                const breakdownHtml = dadosTurnos.map(([turno, contagem]) => {
                    const indicatorClass = VISUAL_CONFIG.turnos[turno]?.indicatorClass || '';
                    return `<span class="turn-detail"><span class="turn-indicator ${indicatorClass}"></span> ${contagem}</span>`;
                }).join('');
                return `<li><span><strong>${nome}:</strong> ${dados.total} vez(es)${balanceAlertHtml}</span><div class="analysis-details">(${breakdownHtml})</div></li>`;
            }).join('');
        contentHTML = `<div class="analysis-content"><div class="analise-turno-bloco"><h5>Análise Global Consolidada</h5><ul>${listaMembrosHtml}</ul></div></div>`;
    } else {
        const turnosParaRenderizar = [filtro];
        contentHTML = turnosParaRenderizar.filter(turno => analise[turno]).map(turno => {
            const dados = analise[turno];
            const listaMembrosHtml = dados.membrosDoTurno.map(membro => {
                const statusIcon = getStatusIconHTML(VISUAL_CONFIG.status[membro.status.type]);
                return `<li><span><strong>${membro.nome}:</strong> ${membro.participacoes} vez(es)</span>${statusIcon}</li>`;
            }).join('');
            return `<div class="analise-turno-bloco"><h5>Análise: ${turno}</h5><p>Participações: <strong>${dados.totalParticipacoesNoTurno}</strong></p><ul>${listaMembrosHtml}</ul></div>`;
        }).join('');
        contentHTML = contentHTML ? `<div class="analysis-content">${contentHTML}</div>` : '';
    }
    container.innerHTML = contentHTML;
    container.style.display = contentHTML ? 'block' : 'none';
}

// =========================================================
// === [PRIORIDADE 1 & 2] AUDITORIA DE CONFLITOS E DUPLICIDADE ===
// =========================================================

export function renderRelatorioConflitos() {
    const container = document.getElementById('conflictReportContainer');
    if (!container) return;

    const conflitos = [];
    const duplicidadePorData = {}; // Mapa para contar ocorrências por dia

    escalaAtual.forEach(dia => {
        const dataChave = dia.data.toDateString(); // Chave única por dia civil
        if (!duplicidadePorData[dataChave]) duplicidadePorData[dataChave] = {};

        dia.selecionados.forEach(membro => {
            if (!membro.nome || membro.isVaga || membro.isConvidado) return;

            // 1. Auditoria de Restrições Técnicas (Regras de disponibilidade)
            const status = checkMemberAvailability(membro, dia.tipo, dia.data);
            if (status.type !== 'disponivel') {
                let motivo = '';
                switch (status.type) {
                    case 'suspenso': motivo = 'Membro Suspenso'; break;
                    case 'permanente': motivo = 'Restrição Permanente'; break;
                    case 'temporaria': motivo = 'Restrição Temporária (Férias)'; break;
                }
                conflitos.push({
                    dia: dia.data.toLocaleDateString('pt-BR'),
                    turno: dia.tipo,
                    membro: membro.nome,
                    motivo: motivo,
                    tipoAlerta: 'danger'
                });
            }

            // 2. Detecção de Duplicidade (Mesmo dia, turnos diferentes)
            duplicidadePorData[dataChave][membro.nome] = (duplicidadePorData[dataChave][membro.nome] || 0) + 1;
        });
    });

    // Processa o mapa de duplicidade para gerar alertas
    Object.keys(duplicidadePorData).forEach(dataChave => {
        const dataFormatada = new Date(dataChave).toLocaleDateString('pt-BR');
        Object.keys(duplicidadePorData[dataChave]).forEach(nome => {
            if (duplicidadePorData[dataChave][nome] > 1) {
                conflitos.push({
                    dia: dataFormatada,
                    turno: 'Multi-turnos',
                    membro: nome,
                    motivo: `Escalado ${duplicidadePorData[dataChave][nome]}x no mesmo dia`,
                    tipoAlerta: 'warning' // Cor diferenciada para duplicidade
                });
            }
        });
    });

    if (conflitos.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <h4><i class="fas fa-exclamation-circle"></i> Auditoria de Conflitos e Duplicidade (${conflitos.length})</h4>
        <ul class="conflict-list">
            ${conflitos.map(c => {
                const estilizacao = c.tipoAlerta === 'warning' 
                    ? 'background-color: #fff3cd; border-left: 5px solid #ffc107; color: #856404;' 
                    : 'background-color: #f8d7da; border-left: 5px solid #dc3545; color: #721c24;';
                
                const tagEstilo = c.tipoAlerta === 'warning' ? 'background-color: #ffc107; color: #212529;' : 'background-color: #dc3545; color: #fff;';

                return `
                <li style="${estilizacao} padding: 10px; margin-bottom: 5px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${c.dia} (${c.turno}):</strong> ${c.membro}</span>
                    <span class="conflict-tag" style="${tagEstilo} font-size: 0.8em; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${c.motivo}</span>
                </li>`;
            }).join('')}
        </ul>`;
}

// =========================================================
// === RENDERIZAÇÃO DE CARDS E DRAG & DROP ===
// =========================================================

export function renderEscalaEmCards(dias) {
    const diasValidos = dias.filter(dia => dia && dia.data instanceof Date);
    escalaAtual = diasValidos;
    const container = document.getElementById('resultadoEscala');
    container.innerHTML = '';
    container.classList.add('escala-container');

    diasValidos.forEach(dia => {
        const turnoConfig = VISUAL_CONFIG.turnos[dia.tipo] || { cardClass: '' };
        const cardHTML = `
            <div class="escala-card ${turnoConfig.cardClass}" data-id="${dia.id}" data-turno="${dia.tipo}" onclick="window.atualizarPainelSuplentes('${dia.id}')">
                <div class="escala-card__header">
                    <h4>${dia.tipo}</h4>
                    <span>${dia.data.toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="escala-card__body">
                    ${dia.selecionados.map((m, idx) => {
                        if (m.isVaga || !m.nome) {
                            return `<div class="membro-card vaga-aberta" onclick="event.stopPropagation(); window.abrirModalConvidado('${dia.id}', ${idx})">
                                        <i class="fas fa-plus-circle"></i> Vaga Aberta
                                    </div>`;
                        }
                        const removeBtn = `<button class="card-remove-btn" onclick="event.stopPropagation(); window.limparVaga('${dia.id}', ${idx})"><i class="fas fa-times"></i></button>`;
                        if (m.isConvidado) {
                            return `<div class="membro-card convidado" draggable="true" data-nome="${m.nome}">
                                        <i class="fas fa-user-tag"></i> ${m.nome}${removeBtn}
                                    </div>`;
                        }
                        const conjugeIcon = m.conjuge ? `<i class="fas fa-ring spouse-icon" title="Cônjuge: ${m.conjuge}"></i>` : '';
                        return `<div class="membro-card" draggable="true" data-nome="${m.nome}">${conjugeIcon}${m.nome}${removeBtn}</div>`;
                    }).join('')}
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
    aplicarFeedbackFadiga(diasValidos);
    renderRelatorioConflitos(); // Atualiza auditoria sempre que renderizar
    if (diasValidos.length > 0) {
        setTimeout(() => { if (typeof window.atualizarPainelSuplentes === 'function') window.atualizarPainelSuplentes(diasValidos[0].id); }, 100);
    }
}

export function aplicarFeedbackFadiga(dias) {
    const cultos = dias.filter(d => ['Quarta', 'Domingo Manhã', 'Domingo Noite'].includes(d.tipo));
    for (let i = 2; i < cultos.length; i++) {
        const atual = cultos[i];
        atual.selecionados.forEach(membro => {
            if (!membro.nome || membro.isVaga || membro.isConvidado) return;
            const estavaAnt = cultos[i-1].selecionados.some(m => m.nome === membro.nome);
            const estavaAntepen = cultos[i-2].selecionados.some(m => m.nome === membro.nome);
            if (estavaAnt && estavaAntepen) {
                const card = document.querySelector(`.escala-card[data-id="${atual.id}"]`);
                const el = card?.querySelector(`.membro-card[data-nome="${membro.nome}"]`);
                if (el) { el.classList.add('fadiga-alert'); el.title = "Alerta: 3º turno consecutivo!"; }
            }
        });
    }
}

export function exibirIndiceEquilibrio(justificationData) {
    const container = document.getElementById('balanceIndexContainer');
    if (!container) return;
    const counts = Object.values(justificationData).map(d => d.participations);
    if (counts.length === 0) { container.style.display = 'none'; return; }
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total === 0) { container.style.display = 'none'; return; }
    const mean = total / counts.length;
    const stdDev = Math.sqrt(counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length);
    let balance = Math.min(100, Math.max(0, 100 - (stdDev / mean) * 100));
    container.style.display = 'block';
    container.innerHTML = `<h4>Índice de Equilíbrio da Escala</h4><div class="balance-bar-background"><div class="balance-bar-foreground" style="width: ${balance.toFixed(2)}%;">${balance.toFixed(0)}%</div></div>`;
    const bar = container.querySelector('.balance-bar-foreground');
    bar.style.background = balance < 60 ? '#dc3545' : balance < 85 ? '#ffc107' : '#28a745';
}

export function renderizarFiltros(dias) {
    const container = document.getElementById('escala-filtros');
    if (!container) return;
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    if (turnos.length <= 1) { container.innerHTML = ''; return; }
    container.innerHTML = `<button class="active" data-filter="all">Todos</button>${turnos.map(t => `<button data-filter="${t}">${t}</button>`).join('')}`;
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    newContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            newContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            filtrarCards(e.target.dataset.filter);
            renderAnaliseConcentracao(e.target.dataset.filter);
        }
    });
}

function filtrarCards(filtro) {
    document.querySelectorAll('.escala-card').forEach(card => card.classList.toggle('hidden', filtro !== 'all' && card.dataset.turno !== filtro));
}

export function renderDisponibilidadeGeral() {
    const container = document.getElementById('disponibilidadeContainer');
    if (!container) return;
    const turnos = ['Quarta', 'Domingo Manhã', 'Domingo Noite', 'Sábado', 'Oração no WhatsApp'];
    let contentHTML = '';
    turnos.forEach(turno => {
        const listaD = []; const listaI = [];
        membros.forEach(membro => {
            let status = { type: 'disponivel' }; let isD = true;
            let key = turno === 'Sábado' ? 'sabado' : turno === 'Oração no WhatsApp' ? 'whatsapp' : 'cultos';
            if (membro.suspensao[key]) { status = { type: 'suspenso' }; isD = false; }
            else if (restricoesPermanentes.some(r => r.membro === membro.nome && r.diaSemana === turno)) { status = { type: 'permanente' }; isD = false; }
            const icon = getStatusIconHTML(VISUAL_CONFIG.status[status.type]);
            const html = `<li><span>${membro.nome}</span>${icon}</li>`;
            if (isD) listaD.push(html); else listaI.push(html);
        });
        contentHTML += `<div class="disponibilidade-turno-bloco"><h5>Turno: ${turno}</h5><div class="list-container"><div class="list-wrapper disponiveis"><h6>Disponíveis</h6><ul>${listaD.join('')}</ul></div><div class="list-wrapper indisponiveis"><h6>Indisponíveis</h6><ul>${listaI.join('')}</ul></div></div></div>`;
    });
    container.innerHTML = contentHTML;
}

window.atualizarPainelSuplentes = function(cardId) {
    diaSelecionadoId = cardId;
    const dia = escalaAtual.find(d => d.id === cardId);
    if (!dia) return;
    const painel = document.getElementById('painelSuplentes');
    const lista = document.getElementById('listaSuplentes');
    document.querySelectorAll('.escala-card').forEach(c => { c.style.borderColor = ''; c.style.boxShadow = ''; c.style.transform = ''; });
    const cardAtivo = document.querySelector(`.escala-card[data-id="${cardId}"]`);
    if (cardAtivo) { cardAtivo.style.borderColor = '#4682b4'; cardAtivo.style.boxShadow = '0 0 15px rgba(70, 130, 180, 0.4)'; cardAtivo.style.transform = 'scale(1.02)'; }
    if(painel) painel.style.display = 'block';
    const sugestoes = membros.filter(m => !dia.selecionados.some(s => s.nome === m.nome)).sort((a, b) => (justificationDataAtual[a.nome]?.participations || 0) - (justificationDataAtual[b.nome]?.participations || 0));
    if(lista) {
        lista.innerHTML = sugestoes.map(m => {
            const parts = justificationDataAtual[m.nome]?.participations || 0;
            let icones = []; let isR = false;
            let key = dia.tipo === 'Sábado' ? 'sabado' : dia.tipo === 'Oração no WhatsApp' ? 'whatsapp' : 'cultos';
            if (m.suspensao[key]) { icones.push('<i class="fas fa-pause-circle" style="color:#ffc107"></i>'); isR = true; }
            if (todasAsRestricoesPerm.some(r => r.membro === m.nome && r.diaSemana === dia.tipo)) { icones.push('⛔'); isR = true; }
            const dA = new Date(dia.data); dA.setHours(0,0,0,0);
            if (todasAsRestricoes.some(r => { const i = new Date(r.inicio); i.setHours(0,0,0,0); const f = new Date(r.fim); f.setHours(0,0,0,0); return r.membro === m.nome && dA >= i && dA <= f; })) { icones.push('🚫'); isR = true; }
            if (icones.length === 0) icones.push('<i class="fas fa-check-circle" style="color:#28a745"></i>');
            return `<li draggable="true" class="suplente-item ${isR ? 'com-restricao' : ''}" data-nome="${m.nome}"><span class="suplente-status-icons">${icones.join(' ')}</span>${m.nome}<span class="suplente-badge">${parts}x</span></li>`;
        }).join('');
        setupDragParaSuplentes();
    }
};

function setupDragParaSuplentes() {
    document.querySelectorAll('.suplente-item').forEach(item => { item.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', item.dataset.nome); e.dataTransfer.setData('source-type', 'suplente'); }); });
}

window.limparVaga = function(diaId, index) {
    if (!confirm("Remover membro?")) return;
    const dia = escalaAtual.find(d => d.id === diaId);
    if (!dia) return;
    const m = dia.selecionados[index];
    if (m.nome && !m.isConvidado && justificationDataAtual[m.nome]) justificationDataAtual[m.nome].participations--;
    dia.selecionados[index] = { nome: null, isVaga: true };
    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    if (diaSelecionadoId) window.atualizarPainelSuplentes(diaSelecionadoId);
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
    showToast('Membro removido.');
};

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
    if(dia) {
        dia.selecionados[idx] = { nome: nome, isConvidado: true, genero: 'X' };
        renderEscalaEmCards(escalaAtual);
        exibirIndiceEquilibrio(justificationDataAtual);
        if (diaSelecionadoId) window.atualizarPainelSuplentes(diaSelecionadoId);
        configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
        document.getElementById('modalNomeExterno').style.display = 'none';
        showToast(`Convidado ${nome} adicionado.`);
    }
};

function _executarTroca(nomeArrastado, nomeAlvo, diaAlvo, indexAlvo, isFromSuplente) {
    const mObj = membros.find(m => m.nome === nomeArrastado);
    if (!isFromSuplente) {
        escalaAtual.forEach(d => {
            const idx = d.selecionados.findIndex(m => m.nome === nomeArrastado);
            if (idx > -1) d.selecionados[idx] = { nome: null, isVaga: true };
        });
    }
    if (nomeAlvo && justificationDataAtual[nomeAlvo]) justificationDataAtual[nomeAlvo].participations--;
    diaAlvo.selecionados[indexAlvo] = mObj;
    if (justificationDataAtual[nomeArrastado]) justificationDataAtual[nomeArrastado].participations++;
    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    if (diaSelecionadoId) window.atualizarPainelSuplentes(diaSelecionadoId);
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
    showToast('Alteração realizada.');
}

function remanejarMembro(nomeA, nomeAlvo, cardO, cardAlvoId, sourceType) {
    const diaA = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaA) return;
    let idx = nomeAlvo ? diaA.selecionados.findIndex(m => m.nome === nomeAlvo) : diaA.selecionados.findIndex(m => m.isVaga);
    if (idx === -1) return;
    const mObj = membros.find(m => m.nome === nomeA);
    if (diaA.selecionados.some(m => m.nome === nomeA)) { showToast(`${nomeA} já está neste dia.`, 'warning'); return; }
    const status = checkMemberAvailability(mObj, diaA.tipo, diaA.data);
    if (status.type !== 'disponivel') {
        const modal = document.getElementById('modalConfirmacaoForce');
        let msg = status.type === 'suspenso' ? 'Membro Suspenso' : status.type === 'permanente' ? 'Restrição Permanente' : 'Férias/Ausência';
        document.getElementById('msgRestricaoForce').innerHTML = `<strong>${nomeA}</strong>: ${msg}`;
        document.getElementById('forceNomeArrastado').value = nomeA;
        document.getElementById('forceNomeAlvo').value = nomeAlvo || '';
        document.getElementById('forceCardAlvoId').value = cardAlvoId;
        document.getElementById('forceIndexAlvo').value = idx;
        document.getElementById('forceSourceType').value = sourceType;
        modal.style.display = 'flex';
        return;
    }
    _executarTroca(nomeA, nomeAlvo, diaA, idx, sourceType === 'suplente');
}

export function configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentes) {
    escalaAtual = dias; justificationDataAtual = justificationData; todasAsRestricoes = restricoes; todasAsRestricoesPerm = restricoesPermanentes;
    document.querySelectorAll('.membro-card, .vaga-aberta').forEach(card => {
        if (!card.classList.contains('vaga-aberta') && !card.classList.contains('convidado')) {
            card.addEventListener('dragstart', (e) => { e.target.classList.add('dragging'); e.dataTransfer.setData('text/plain', e.target.dataset.nome); e.dataTransfer.setData('card-id', e.target.closest('.escala-card').dataset.id); e.dataTransfer.setData('source-type', 'escala'); });
            card.addEventListener('dragend', (e) => e.target.classList.remove('dragging'));
        }
        card.addEventListener('dragover', (e) => { e.preventDefault(); e.target.classList.add('drag-over'); });
        card.addEventListener('dragleave', (e) => e.target.classList.remove('drag-over'));
        card.addEventListener('drop', (e) => { e.preventDefault(); e.target.classList.remove('drag-over'); remanejarMembro(e.dataTransfer.getData('text/plain'), e.target.dataset.nome || null, e.dataTransfer.getData('card-id'), e.target.closest('.escala-card').dataset.id, e.dataTransfer.getData('source-type')); });
    });
}
