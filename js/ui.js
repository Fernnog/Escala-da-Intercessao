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

// Armazenamento de estado global da UI
export let escalaAtual = [];
let justificationDataAtual = {};
let todasAsRestricoes = [];
let todasAsRestricoesPerm = [];
let diaSelecionadoNoPainelId = null; // Controle do Painel Lateral

// Helper para verificar se é turno de culto (para fadiga)
const isTurnoCulto = (tipo) => ['Quarta', 'Domingo Manhã', 'Domingo Noite'].includes(tipo);

function getStatusIconHTML(statusConfig) {
    if (!statusConfig) return '';
    if (statusConfig.type === 'emoji') {
        return `<span class="status-icon status-emoji ${statusConfig.classe}" title="${statusConfig.titulo}">${statusConfig.value}</span>`;
    }
    return `<i class="fas ${statusConfig.value} status-icon ${statusConfig.classe}" title="${statusConfig.titulo}"></i>`;
}

// =========================================================
// === SEÇÃO DE ATUALIZAÇÃO DE LISTAS (CRUD) ===
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
        </li>`).join('');
}

export function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
    atualizarListaEscalasSalvas();
}

// =========================================================
// === SEÇÃO DE PAINEL INTELIGENTE E VAGAS (NOVO) ===
// =========================================================

// Função chamada ao clicar em um Card da Escala
window.atualizarPainelSuplentes = function(cardId) {
    const dia = escalaAtual.find(d => d.id === cardId);
    if (!dia) return;
    
    diaSelecionadoNoPainelId = cardId;
    const painel = document.getElementById('painelSuplentes');
    const lista = document.getElementById('listaSuplentes');
    const contexto = document.getElementById('painel-contexto');
    const btnFechar = document.getElementById('btn-fechar-painel');
    const inputBusca = document.getElementById('buscaSuplente');

    if (painel) painel.style.display = 'block';
    if (contexto) contexto.textContent = `Para: ${dia.tipo} (${dia.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;

    // Reset da busca
    if (inputBusca) {
        inputBusca.value = '';
        inputBusca.onkeyup = () => renderizarListaSuplentes(dia, inputBusca.value);
    }
    
    if (btnFechar) btnFechar.onclick = () => { painel.style.display = 'none'; };

    renderizarListaSuplentes(dia, '');
};

function renderizarListaSuplentes(dia, termoBusca) {
    const lista = document.getElementById('listaSuplentes');
    if(!lista) return;

    const escaladosNesteDia = dia.selecionados.map(s => s.nome).filter(n => n);
    const termo = termoBusca.toLowerCase();

    // Filtra e Ordena
    const sugestoes = membros
        .filter(m => !escaladosNesteDia.includes(m.nome)) // Remove quem já está no dia
        .filter(m => m.nome.toLowerCase().includes(termo)) // Filtro de busca
        .sort((a, b) => {
            // Ordena por participações (Crescente) - Prioriza quem tem menos
            const pA = justificationDataAtual[a.nome] ? justificationDataAtual[a.nome].participations : 0;
            const pB = justificationDataAtual[b.nome] ? justificationDataAtual[b.nome].participations : 0;
            return pA - pB;
        });

    lista.innerHTML = sugestoes.map(m => {
        const parts = justificationDataAtual[m.nome] ? justificationDataAtual[m.nome].participations : 0;
        const status = checkMemberAvailability(m, dia.tipo, dia.data);
        // Exibe alerta visual se houver qualquer restrição, mas permite arrastar
        const alerta = status.type !== 'disponivel' ? '⚠️' : ''; 
        const classeBadge = parts <= 1 ? 'low-part' : ''; // Destaque para quem trabalhou pouco
        
        return `
            <li draggable="true" class="suplente-item" data-nome="${m.nome}">
                <span title="${status.type === 'disponivel' ? 'Disponível' : 'Possui Restrição'}">${alerta} ${m.nome}</span>
                <span class="suplente-badge ${classeBadge}">${parts}x</span>
            </li>
        `;
    }).join('');

    // Re-aplicar DragEvents nos itens da lista lateral
    setupDragParaSuplentes();
}

function setupDragParaSuplentes() {
    const itens = document.querySelectorAll('.suplente-item');
    itens.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.nome);
            e.dataTransfer.setData('origem-tipo', 'painel'); // Marca que veio do painel
        });
    });
}

// Lógica de Modal para Convidado
window.abrirModalConvidado = function(diaId, indiceVaga) {
    const modal = document.getElementById('modalNomeExterno');
    document.getElementById('externoDiaId').value = diaId;
    document.getElementById('externoIndiceVaga').value = indiceVaga;
    document.getElementById('inputNomeExterno').value = '';
    
    const btnConfirm = document.getElementById('btn-confirmar-externo');
    btnConfirm.onclick = confirmAdicaoExterno;
    
    if(modal) modal.style.display = 'flex';
};

function confirmAdicaoExterno() {
    const nome = document.getElementById('inputNomeExterno').value;
    const diaId = document.getElementById('externoDiaId').value;
    const idx = parseInt(document.getElementById('externoIndiceVaga').value);
    
    if(!nome) return showToast('Digite um nome para o convidado.', 'warning');

    const dia = escalaAtual.find(d => d.id === diaId);
    if(dia) {
        // Substitui a vaga (ou membro) pelo Convidado
        dia.selecionados[idx] = { 
            nome: nome, 
            isConvidado: true,
            genero: 'X' // Genero neutro para não travar validações
        };
        renderEscalaEmCards(escalaAtual);
        showToast('Convidado adicionado com sucesso.', 'success');
        document.getElementById('modalNomeExterno').style.display = 'none';
    }
}

// =========================================================
// === SEÇÃO DE RENDERIZAÇÃO DA ESCALA E FADIGA (NOVO) ===
// =========================================================

// Função para identificar e pintar visualmente o desgaste de 3 turnos
function aplicarFeedbackFadiga(dias) {
    // Filtra cronologicamente apenas os turnos de culto (onde a fadiga conta)
    const cultos = dias.filter(d => d.data && isTurnoCulto(d.tipo))
                       .sort((a, b) => a.data - b.data || (a.tipo === 'Domingo Manhã' ? -1 : 1));
    
    // Começa do índice 2, pois precisa de 2 anteriores para formar sequência de 3
    for (let i = 2; i < cultos.length; i++) {
        const atual = cultos[i];
        const anterior = cultos[i-1];
        const antepenultimo = cultos[i-2];

        // Verifica cada membro escalado no dia atual
        atual.selecionados.forEach(membro => {
            // Ignora vagas vazias ou convidados
            if (!membro.nome || membro.isVaga || membro.isConvidado) return;

            const estavaAnt = anterior.selecionados.some(m => m.nome === membro.nome);
            const estavaAntepen = antepenultimo.selecionados.some(m => m.nome === membro.nome);

            if (estavaAnt && estavaAntepen) {
                // Encontra o elemento DOM e aplica o estilo
                const cardDiaEl = document.querySelector(`.escala-card[data-id="${atual.id}"]`);
                if (cardDiaEl) {
                    const membroEl = cardDiaEl.querySelector(`.membro-card[data-nome="${membro.nome}"]`);
                    if (membroEl) {
                        membroEl.classList.add('fadiga-alert');
                        membroEl.title = "Alerta: 3º turno consecutivo!"; // Tooltip nativo
                    }
                }
            }
        });
    }
}

export function renderEscalaEmCards(dias) {
    const diasValidos = dias.filter(dia => dia && dia.data instanceof Date);
    escalaAtual = diasValidos;
    const container = document.getElementById('resultadoEscala');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    diasValidos.forEach(dia => {
        const turnoConfig = VISUAL_CONFIG.turnos[dia.tipo] || { cardClass: '' };
        
        // Gera HTML dos membros (tratando Vagas e Convidados)
        const membrosHTML = dia.selecionados.map((m, idx) => {
            // Caso 1: Vaga em Aberto (Vermelho)
            if (m.isVaga || !m.nome) {
                return `<div class="membro-card vaga-aberta" onclick="window.abrirModalConvidado('${dia.id}', ${idx})">
                            <i class="fas fa-plus"></i> Vaga
                        </div>`;
            }
            // Caso 2: Convidado Externo (Roxo)
            if (m.isConvidado) {
                 return `<div class="membro-card convidado" draggable="true" data-nome="${m.nome}" data-externo="true">
                            ${m.nome}
                        </div>`;
            }
            // Caso 3: Membro Normal
            return `<div class="membro-card" draggable="true" data-nome="${m.nome}">${m.nome}</div>`;
        }).join('');

        // Adiciona onclick no card para ativar o Painel Lateral
        const cardHTML = `
            <div class="escala-card ${turnoConfig.cardClass}" data-id="${dia.id}" data-turno="${dia.tipo}" onclick="window.atualizarPainelSuplentes('${dia.id}')">
                <div class="escala-card__header">
                    <h4>${dia.tipo}</h4>
                    <span>${dia.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
                <div class="escala-card__body">
                    ${membrosHTML}
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });

    // Pós-renderização: Aplica o feedback visual de fadiga
    aplicarFeedbackFadiga(escalaAtual)
    aplicarFeedbackFadiga(diasValidos);
}

// =========================================================
// === SEÇÃO DE DRAG & DROP COM VALIDAÇÃO (FORCE) (NOVO) ===
// =========================================================

// Função que efetiva a troca de dados e re-renderiza
function executarTroca(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    
    // Recupera objeto completo do membro (ou cria stub se for painel)
    const membroArrastadoObj = membros.find(m => m.nome === nomeArrastado) || { nome: nomeArrastado, suspensao: {} };
    
    // Identifica onde soltou
    const indexAlvo = diaAlvo.selecionados.findIndex(m => (m.nome === nomeAlvo) || (m.isVaga && nomeAlvo === undefined));
    
    // Se soltou em cima de alguém ou de uma vaga específica
    if (indexAlvo !== -1) {
        // Se a posição alvo era um membro real, decrementa estatística dele (pois está saindo)
        const alvoAntigo = diaAlvo.selecionados[indexAlvo];
        if (alvoAntigo && alvoAntigo.nome && !alvoAntigo.isConvidado && !alvoAntigo.isVaga) {
             if (justificationDataAtual[alvoAntigo.nome]) justificationDataAtual[alvoAntigo.nome].participations--;
        }
        
        // Substitui
        diaAlvo.selecionados[indexAlvo] = membroArrastadoObj;
    } else {
        // Fallback (apenas segurança)
        diaAlvo.selecionados.push(membroArrastadoObj);
    }
    
    // Incrementa estatística do novo membro
    if (justificationDataAtual[nomeArrastado]) {
        justificationDataAtual[nomeArrastado].participations++;
    }

    // Se veio de outro card (não do painel), tem que tirar da origem
    if (cardOrigemId && cardOrigemId !== 'painel') {
        const diaOrigem = escalaAtual.find(d => d.id === cardOrigemId);
        if (diaOrigem) {
            const indexOrigem = diaOrigem.selecionados.findIndex(m => m.nome === nomeArrastado);
            if (indexOrigem !== -1) {
                // Origem vira Vaga
                diaOrigem.selecionados[indexOrigem] = { nome: null, isVaga: true };
                // Decrementa pois saiu da origem (evita contagem dupla)
                if (justificationDataAtual[nomeArrastado]) justificationDataAtual[nomeArrastado].participations--; 
            }
        }
    }

    // Renderiza e Atualiza tudo
    renderEscalaEmCards(escalaAtual);
    exibirIndiceEquilibrio(justificationDataAtual);
    configurarDragAndDrop(escalaAtual, justificationDataAtual, todasAsRestricoes, todasAsRestricoesPerm);
    
    // Atualiza relatórios se abertos
    const filtroAtivo = document.querySelector('#escala-filtros button.active')?.dataset.filter || 'all';
    renderAnaliseConcentracao(filtroAtivo);
    
    // Atualiza painel se estiver vendo esse dia
    if(diaSelecionadoNoPainelId) window.atualizarPainelSuplentes(diaSelecionadoNoPainelId);

    showToast(`${nomeArrastado} adicionado com sucesso.`, 'success');
}

function remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId) {
    const diaAlvo = escalaAtual.find(d => d.id === cardAlvoId);
    if (!diaAlvo) return;

    // Bloqueia duplicidade simples no mesmo dia
    if (diaAlvo.selecionados.some(m => m.nome === nomeArrastado)) {
        return showToast(`${nomeArrastado} já está escalado(a) neste dia.`, 'warning');
    }

    const membro = membros.find(m => m.nome === nomeArrastado);
    if (!membro) return; // Se erro de dados

    const erros = [];

    // 1. Validação de Restrições (Temp, Perm, Suspensão)
    const status = checkMemberAvailability(membro, diaAlvo.tipo, diaAlvo.data);
    if (status.type === 'suspenso') erros.push("Membro está Suspenso desta atividade.");
    if (status.type === 'permanente') erros.push("Restrição Permanente para este turno.");
    if (status.type === 'temporaria') erros.push("Restrição Temporária (Férias/Data).");

    // 2. Validação de Compatibilidade (Duplas - Gênero/Cônjuge)
    // Verifica com quem ele vai fazer par (todos no card exceto vaga ou convidado)
    const companheiros = diaAlvo.selecionados.filter(m => m.nome !== nomeAlvo && !m.isVaga && !m.isConvidado);
    for (const p of companheiros) {
        if (!saoCompativeis(membro, p)) {
            erros.push(`Incompatibilidade de gênero/cônjuge com ${p.nome}.`);
        }
    }

    // 3. Validação de Fadiga (NOVO: Monitor de Sequência)
    if (isTurnoCulto(diaAlvo.tipo)) {
        const cultos = escalaAtual.filter(d => d.data && isTurnoCulto(d.tipo))
                                  .sort((a, b) => a.data - b.data || (a.tipo === 'Domingo Manhã' ? -1 : 1));
        
        const idxAtual = cultos.findIndex(d => d.id === diaAlvo.id);
        
        // Se tiver pelo menos 2 cultos antes
        if (idxAtual >= 2) {
            const ant1 = cultos[idxAtual - 1];
            const ant2 = cultos[idxAtual - 2];
            
            const estava1 = ant1.selecionados.some(m => m.nome === nomeArrastado);
            const estava2 = ant2.selecionados.some(m => m.nome === nomeArrastado);

            if (estava1 && estava2) {
                erros.push("Alerta de Fadiga: Membro escalado no 3º culto consecutivo.");
            }
        }
    }

    // DECISÃO: Executar Direto ou Abrir Modal de Force
    if (erros.length > 0) {
        const modal = document.getElementById('modalConfirmacaoForce');
        const msgEl = document.getElementById('msgRestricaoForce');
        const btnSim = document.getElementById('btn-force-sim');

        msgEl.innerHTML = `
            <strong>O movimento gerou os seguintes alertas:</strong>
            <ul style="margin-top:10px; color:#dc3545; text-align:left;">
                ${erros.map(e => `<li>${e}</li>`).join('')}
            </ul>`;

        // Sobrescreve o onclick para executar ignorando os erros
        btnSim.onclick = () => {
            executarTroca(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId);
            modal.style.display = 'none';
        };

        modal.style.display = 'flex';
    } else {
        // Sem erros, executa direto
        executarTroca(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId);
    }
}

export function configurarDragAndDrop(dias, justificationData, restricoes, restricoesPermanentesArg) {
    escalaAtual = dias;
    justificationDataAtual = justificationData;
    todasAsRestricoes = restricoes;
    todasAsRestricoesPerm = restricoesPermanentesArg;

    const dropTargets = document.querySelectorAll('.membro-card, .escala-card');
    
    // Draggables (Membros normais)
    const membrosDraggables = document.querySelectorAll('.membro-card:not(.vaga-aberta)'); 
    membrosDraggables.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.nome);
            e.dataTransfer.setData('card-id', e.target.closest('.escala-card').dataset.id);
        });
        card.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
    });

    // Drop Zones
    dropTargets.forEach(target => {
        target.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('membro-card')) {
                e.target.classList.add('drag-over');
            }
        });
        target.addEventListener('dragleave', (e) => {
            if (e.target.classList.contains('membro-card')) {
                e.target.classList.remove('drag-over');
            }
        });
        target.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('membro-card')) {
                e.target.classList.remove('drag-over');
            }

            const nomeArrastado = e.dataTransfer.getData('text/plain');
            let cardOrigemId = e.dataTransfer.getData('card-id'); 
            const origemTipo = e.dataTransfer.getData('origem-tipo'); 
            if (origemTipo === 'painel') cardOrigemId = 'painel';

            let cardAlvoElement = e.target.closest('.escala-card');
            if (!cardAlvoElement) return;
            const cardAlvoId = cardAlvoElement.dataset.id;
            
            const slotAlvo = e.target.closest('.membro-card');
            const nomeAlvo = slotAlvo ? slotAlvo.dataset.nome : undefined;

            if (nomeArrastado === nomeAlvo) return;
            
            remanejarMembro(nomeArrastado, nomeAlvo, cardOrigemId, cardAlvoId);
        });
    });
}

// =========================================================
// === SEÇÃO DE MODAIS, TOASTS E AUXILIARES ===
// =========================================================

export function abrirModalAcaoEscala(action, escalaId = null, escalaNome = '') {
    const modal = document.getElementById('escalaActionModal');
    const title = document.getElementById('escalaModalTitle');
    const body = document.getElementById('escalaModalBody');
    document.getElementById('escalaModalAction').value = action;
    document.getElementById('escalaModalId').value = escalaId;

    if (action === 'save' || action === 'rename') {
        title.textContent = action === 'save' ? 'Salvar Escala' : 'Renomear Escala';
        const defaultName = (action === 'save') ? `Escala de ${new Date().toLocaleDateString('pt-BR')}` : escalaNome;
        body.innerHTML = `
            <div class="input-group">
                <input type="text" id="escalaModalInputName" value="${defaultName}" required placeholder=" ">
                <label for="escalaModalInputName">Nome da Escala</label>
            </div>`;
    } else if (action === 'delete') {
        title.textContent = 'Confirmar Exclusão';
        body.innerHTML = `<p>Você tem certeza que deseja excluir a escala "<strong>${escalaNome}</strong>"? Esta ação não pode ser desfeita.</p>`;
    }
    if(modal) modal.style.display = 'flex';
}

export function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

export function toggleConjuge() {
    const field = document.getElementById('conjugeField');
    const check = document.getElementById('conjugeParticipa');
    if(field && check) field.style.display = check.checked ? 'block' : 'none';
}

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
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
        const nomes = Array.from(membrosNodes).map(node => {
            if (node.classList.contains('vaga-aberta')) return '[VAGA]';
            if (node.classList.contains('convidado')) return `${node.innerText.replace(' (Ext)', '')} (Ext)`;
            return node.textContent.trim();
        });
        const row = [data, tipo, ...nomes];
        while (row.length < headers.length) { row.push(''); }
        dadosEscala.push(row);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala do Mês');
    XLSX.writeFile(wb, 'escala_gerada.xlsx');
}

export function renderAnaliseConcentracao(filtro = 'all') {
    const container = document.getElementById('diagnosticReportContainer');
    if (!container) return;

    // Função interna de análise detalhada (mantida da versão original)
    const _analisar = (dias) => {
        const analise = {};
        const turnosCulto = ['Quarta', 'Domingo Manhã', 'Domingo Noite'];
        turnosCulto.forEach(turno => {
            const membrosDoTurno = [];
            let totalPart = 0;
            membros.forEach(m => {
                const parts = dias.filter(d => d.tipo === turno && d.selecionados.some(s => s.nome === m.nome)).length;
                totalPart += parts;
                
                // Pega status para exibir ícones na análise detalhada
                let status = { type: 'disponivel' };
                let isDisponivel = true;
                if (m.suspensao.cultos) { isDisponivel = false; status = { type: 'suspenso' }; }
                else if (restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === turno)) { status = { type: 'permanente' }; isDisponivel = false; }
                
                membrosDoTurno.push({ nome: m.nome, participacoes: parts, status: status, isDisponivel: isDisponivel });
            });
            analise[turno] = { 
                totalParticipacoesNoTurno: totalPart, 
                membrosDisponiveis: membrosDoTurno.filter(m => m.isDisponivel).length,
                membrosDoTurno: membrosDoTurno.sort((a,b)=>b.participacoes - a.participacoes) 
            };
        });
        return analise;
    };

    const analise = _analisar(escalaAtual);
    let contentHTML = '';

    if (filtro === 'all') {
        // ... (Lógica de análise global mantida) ...
        const participacoesGlobais = {};
        membros.forEach(m => { participacoesGlobais[m.nome] = { total: 0 }; });

        escalaAtual.forEach(dia => {
            dia.selecionados.forEach(membro => {
                if (membro.nome && !membro.isVaga && !membro.isConvidado && participacoesGlobais[membro.nome]) {
                    participacoesGlobais[membro.nome].total++;
                    participacoesGlobais[membro.nome][dia.tipo] = (participacoesGlobais[membro.nome][dia.tipo] || 0) + 1;
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
                const balanceAlertHtml = isUnbalanced ? `<i class="fas fa-exclamation-triangle balance-warning" title="Atenção: Participação concentrada."></i>` : '';
                
                const breakdownHtml = dadosTurnos.map(([turno, contagem]) => {
                    const indicatorClass = VISUAL_CONFIG.turnos[turno]?.indicatorClass || '';
                    return `<span class="turn-detail"><span class="turn-indicator ${indicatorClass}"></span> ${contagem}</span>`;
                }).join('');

                return `<li><span><strong>${nome}:</strong> ${dados.total} vez(es)${balanceAlertHtml}</span><div class="analysis-details">(${breakdownHtml})</div></li>`;
            }).join('');

        contentHTML = `<div class="analysis-content"><div class="analise-turno-bloco"><h5>Análise Global Consolidada</h5><p>Detalhamento por turno.</p><ul>${listaMembrosHtml}</ul></div></div>`;

    } else {
        // Renderiza turno específico com os ÍCONES de status (RESTURADO)
        if(analise[filtro]) {
            const dados = analise[filtro];
            const lista = dados.membrosDoTurno.map(m => {
                const statusConfig = VISUAL_CONFIG.status[m.status.type];
                const statusIcon = getStatusIconHTML(statusConfig);
                return `<li><span><strong>${m.nome}:</strong> ${m.participacoes} vez(es)</span>${statusIcon}</li>`;
            }).join('');
            contentHTML = `<div class="analysis-content"><div class="analise-turno-bloco"><h5>${filtro}</h5><p>Total: <strong>${dados.totalParticipacoesNoTurno}</strong> | Disp: <strong>${dados.membrosDisponiveis}</strong></p><ul>${lista || '<li>Vazio.</li>'}</ul></div></div>`;
        }
    }
    container.innerHTML = contentHTML;
    container.style.display = contentHTML ? 'block' : 'none';
}

export function exibirIndiceEquilibrio(justificationData) {
    const container = document.getElementById('balanceIndexContainer');
    if (!container) return;
    const counts = Object.values(justificationData).map(d => d.participations);
    if (counts.length === 0 || counts.reduce((a,b)=>a+b,0) === 0) { container.style.display = 'none'; return; }
    
    const mean = counts.reduce((a,b)=>a+b,0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const balancePercentage = Math.min(100, Math.max(0, 100 - (Math.sqrt(variance) / mean) * 100));

    container.style.display = 'block';
    container.innerHTML = `
        <h4>Índice de Equilíbrio <small>(clique para detalhes)</small></h4>
        <div class="balance-bar-background"><div class="balance-bar-foreground" style="width: ${balancePercentage.toFixed(2)}%;">${balancePercentage.toFixed(0)}%</div></div>`;
    const bar = container.querySelector('.balance-bar-foreground');
    if (balancePercentage < 60) bar.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)';
    else if (balancePercentage < 85) bar.style.background = 'linear-gradient(90deg, #ffc107, #ffda58)';
    else bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)';
}

export function renderizarFiltros(dias) {
    const container = document.getElementById('escala-filtros');
    if (!container) return;
    const turnos = [...new Set(dias.filter(d => d.selecionados.length > 0).map(d => d.tipo))];
    
    container.innerHTML = `
        <button class="active" data-filter="all">Todos</button>
        ${turnos.map(turno => `<button data-filter="${turno}">${turno}</button>`).join('')}`;
    
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    newContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            newContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            const filtro = e.target.dataset.filter;
            
            document.querySelectorAll('.escala-card').forEach(card => {
                card.classList.toggle('hidden', filtro !== 'all' && card.dataset.turno !== filtro);
            });
            renderAnaliseConcentracao(filtro);
        }
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
            const status = checkMemberAvailability(membro, turno, null); 
            const statusConfig = VISUAL_CONFIG.status[status.type];
            const statusIcon = getStatusIconHTML(statusConfig);
            const membroHTML = `<li><span>${membro.nome}</span>${statusIcon}</li>`;

            if (status.type === 'disponivel') listaDisponiveis.push(membroHTML);
            else listaIndisponiveis.push(membroHTML);
        });

        contentHTML += `
            <div class="disponibilidade-turno-bloco">
                <h5>${turno}</h5>
                <div class="list-container">
                    <div class="list-wrapper disponiveis"><h6>Disp. (${listaDisponiveis.length})</h6><ul>${listaDisponiveis.join('')}</ul></div>
                    <div class="list-wrapper indisponiveis"><h6>Indisp. (${listaIndisponiveis.length})</h6><ul>${listaIndisponiveis.join('')}</ul></div>
                </div>
            </div>`;
    });
    container.innerHTML = contentHTML;
}

export function setupUiListeners() {
    const chkConjuge = document.getElementById('conjugeParticipa');
    if(chkConjuge) chkConjuge.addEventListener('change', toggleConjuge);
}

export function aplicarFeedbackFadiga(dias) {
    // Filtra apenas turnos de culto para análise cronológica
    const cultos = dias.filter(d => ['Quarta', 'Domingo Manhã', 'Domingo Noite'].includes(d.tipo));
    
    // Começa do índice 2, pois precisa de 2 anteriores para comparar
    for (let i = 2; i < cultos.length; i++) {
        const atual = cultos[i];
        const anterior = cultos[i-1];
        const antepenultimo = cultos[i-2];

        atual.selecionados.forEach(membro => {
            if (!membro.nome || membro.isVaga || membro.isConvidado) return;

            const estavaAnt = anterior.selecionados.some(m => m.nome === membro.nome);
            const estavaAntepen = antepenultimo.selecionados.some(m => m.nome === membro.nome);

            if (estavaAnt && estavaAntepen) {
                // Seleciona o elemento visual específico
                const cardDiaEl = document.querySelector(`.escala-card[data-id="${atual.id}"]`);
                if (cardDiaEl) {
                    // Atenção ao seletor: aspas duplas no atributo data-nome para evitar erro com espaços
                    const membroEl = cardDiaEl.querySelector(`.membro-card[data-nome="${membro.nome}"]`);
                    if (membroEl) {
                        membroEl.classList.add('fadiga-alert');
                        membroEl.title = "Alerta: 3º turno consecutivo!"; // Tooltip nativo simples
                    }
                }
            }
        });
    }
}
