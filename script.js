let membros = [];
let restricoes = [];
let restricoesPermanentes = [];

// --- Funções Utilitárias (sem alterações) ---

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

function toggleConjuge() {
    document.getElementById('conjugeField').style.display =
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

function salvarDados() {
    localStorage.setItem('dadosEscala', JSON.stringify({ membros, restricoes, restricoesPermanentes }));
}

function carregarDados() {
    const dados = JSON.parse(localStorage.getItem('dadosEscala') || '{}');
    membros = dados.membros || [];
    restricoes = dados.restricoes || [];
    restricoesPermanentes = dados.restricoesPermanentes || [];
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

function limparDados() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        membros = [];
        restricoes = [];
        restricoesPermanentes = [];
        localStorage.clear();
        atualizarListaMembros();
        atualizarSelectMembros();
        atualizarListaRestricoes();
        atualizarListaRestricoesPermanentes();
        document.getElementById('resultadoEscala').innerHTML = '';
    }
}

// --- Funções de Membros (sem alterações) ---
function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    lista.innerHTML = membros.map((m, index) =>
        `<li>${m.nome} (${m.genero}) ${m.conjuge ? '- Cônjuge: ' + m.conjuge : ''}
        <button onclick="excluirMembro(${index})">Excluir</button></li>`).join('');
}

function excluirMembro(index) {
    membros.splice(index, 1);
    atualizarListaMembros();
    atualizarSelectMembros();
    salvarDados();
}

function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um membro</option>' +
            membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    });
}

// --- Funções de Restrições (sem alterações) ---
function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${r.inicio.toLocaleDateString()} a ${r.fim.toLocaleDateString()}
        <button onclick="excluirRestricao(${index})">Excluir</button></li>`).join('');
}

function excluirRestricao(index) {
    restricoes.splice(index, 1);
    atualizarListaRestricoes();
    salvarDados();
}

function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button onclick="excluirRestricaoPermanente(${index})">Excluir</button></li>`).join('');
}

function excluirRestricaoPermanente(index) {
    restricoesPermanentes.splice(index, 1);
    atualizarListaRestricoesPermanentes();
    salvarDados();
}


// --- Funções de Cadastro (sem alterações) ---

document.getElementById('formCadastro').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value;
    const genero = document.getElementById('genero').value;
    const conjugeParticipa = document.getElementById('conjugeParticipa').checked;
    const nomeConjuge = conjugeParticipa ? document.getElementById('nomeConjuge').value : null;

    if (nomeConjuge && !membros.some(m => m.nome === nomeConjuge)) {
        alert('O cônjuge deve estar cadastrado como membro!');
        return;
    }

    membros.push({ nome, genero, conjuge: nomeConjuge });
    atualizarListaMembros();
    atualizarSelectMembros();
    salvarDados();
    e.target.reset();
    toggleConjuge();
});

document.getElementById('formRestricao').addEventListener('submit', (e) => {
    e.preventDefault();
    const membro = document.getElementById('membroRestricao').value;
    const inicio = new Date(document.getElementById('dataInicio').value);
    const fim = new Date(document.getElementById('dataFim').value);

    if (!membro) {
        alert('Selecione um membro!');
        return;
    }
    if (fim < inicio) {
        alert('A data de fim deve ser posterior à data de início!');
        return;
    }

    restricoes.push({ membro, inicio, fim });
    atualizarListaRestricoes();
    salvarDados();
    e.target.reset();
});

document.getElementById('formRestricaoPermanente').addEventListener('submit', (e) => {
    e.preventDefault();
    const membro = document.getElementById('membroRestricaoPermanente').value;
    const diaSemana = document.getElementById('diaSemana').value;

    if (!membro) {
        alert('Selecione um membro!');
        return;
    }

    restricoesPermanentes.push({ membro, diaSemana });
    atualizarListaRestricoesPermanentes();
    salvarDados();
    e.target.reset();
});

// --- Funções de Geração da Escala (COM MELHORIAS) ---


// Função auxiliar para seleção ponderada (OTIMIZADA)
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) {
            return i;
        }
    }
    return weights.length - 1; // Fallback (raramente necessário)
}

// Função de seleção aleatória ponderada
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // Calcular pesos inversamente proporcionais às participações
    const pesos = membrosDisponiveis.map(m => 1 / (1 + participacoes[m.nome]));
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    const pesosNormalizados = pesos.map(p => p / somaPesos);

    // Selecionar membros com base nos pesos
    const selecionados = [];
    const disponiveis = [...membrosDisponiveis]; // Cópia para não alterar o original
    const pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indice = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indice, 1)[0];
        pesosTemp.splice(indice, 1);
        selecionados.push(membroSelecionado);
    }

    return selecionados;
}
// Função de revisão da escala (COM LIMITE DINÂMICO)
function revisarEscala(dias, participacoes) {
    let escalaAlterada = true; // Flag para controlar iterações
    let iteracoes = 0; // Contador de iterações para evitar loops infinitos (segurança)
    const maxIteracoes = 10; // Limite máximo de iterações - ajuste se necessário

    while (escalaAlterada && iteracoes < maxIteracoes) {
        escalaAlterada = false; // Assume que não haverá mais alterações nesta iteração
        iteracoes++;

        const participacoesOrdenadas = Object.entries(participacoes).sort(([, a], [, b]) => a - b);
        const membroMenosParticipou = participacoesOrdenadas[0][0];
        const membroMaisParticipou = participacoesOrdenadas[participacoesOrdenadas.length - 1][0];
        const diferencaParticipacao = participacoes[membroMaisParticipou] - participacoes[membroMenosParticipou];

        if (diferencaParticipacao > 1) { // Se a diferença for maior que 1, tenta balancear
            for (const dia of dias) {
                for (let i = 0; i < dia.selecionados.length; i++) {
                    const membroAtual = dia.selecionados[i];
                    if (membroAtual.nome === membroMaisParticipou) { // Se membro com mais participação está escalado
                        const membrosDisponiveisParaSubstituir = membros.filter(m => {
                            // Critérios de disponibilidade e restrição (já existentes)
                            const restricaoTemp = restricoes.some(r =>
                                r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim
                            );
                            const restricaoPerm = restricoesPermanentes.some(r =>
                                r.membro === m.nome && r.diaSemana === dia.tipo
                            );
                            // Critério adicional: Não ser o membro que já está na posição oposta (se houver 2 pessoas)
                            const naoSerParceiroAtual = dia.selecionados.length === 2 ? m.nome !== dia.selecionados[1 - i].nome : true;
                            // Critério adicional: Ser o membro que menos participou (ou um dos menos)
                            const ehMembroMenosParticipou = m.nome === membroMenosParticipou;

                            return !restricaoTemp && !restricaoPerm && naoSerParceiroAtual && ehMembroMenosParticipou && m.nome !== membroAtual.nome;
                        });

                        // Tenta substituir pelo membro que menos participou
                        const substitutoIdeal = membrosDisponiveisParaSubstituir.find(sub =>
                            (dia.selecionados.length === 1 || // Se for escala de 1 pessoa, qualquer um serve
                                (sub.genero === dia.selecionados[1 - i].genero || // Se for de 2, respeita gênero ou cônjuge
                                    sub.conjuge === dia.selecionados[1 - i].nome ||
                                    dia.selecionados[1 - i].conjuge === sub.nome))
                        );

                        if (substitutoIdeal) {
                            dia.selecionados[i] = substitutoIdeal;
                            participacoes[membroAtual.nome]--;
                            participacoes[substitutoIdeal.nome]++;
                            escalaAlterada = true; // Sinaliza que a escala foi alterada nesta iteração
                            break; // Importante: Após uma substituição, sai do loop interno para reavaliar a escala
                        }
                    }
                }
                if (escalaAlterada) break; // Se houve alteração em um dia, reavalia a escala desde o início
            }
        }
    }

    if (iteracoes >= maxIteracoes) {
        console.warn("Revisão da escala atingiu o limite de iterações, pode não estar totalmente balanceada.");
    }
}

// Evento de submissão do formulário
document.getElementById('formEscala').addEventListener('submit', (e) => {
    e.preventDefault();

    // Captura das opções do formulário
    const gerarCultos = document.getElementById('escalaCultos').checked;
    const gerarSabado = document.getElementById('escalaSabado').checked;
    const gerarOração = document.getElementById('escalaOração').checked;
    const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
    const mes = parseInt(document.getElementById('mesEscala').value);
    const ano = parseInt(document.getElementById('anoEscala').value);
    const resultado = document.getElementById('resultadoEscala');

    // Define o período do mês
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0); // Último dia do mês
    resultado.innerHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3>`;

    // Lista de dias com eventos
    const dias = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.toLocaleString('pt-BR', { weekday: 'long' });

        // Cultos: Quarta, Domingo Manhã e Domingo Noite
        if (gerarCultos) {
            if (diaSemana === 'quarta-feira') {
                dias.push({ data: new Date(d), tipo: 'Quarta', selecionados: [] });
            }
            if (diaSemana === 'domingo') {
                dias.push({ data: new Date(d), tipo: 'Domingo Manhã', selecionados: [] });
                dias.push({ data: new Date(d), tipo: 'Domingo Noite', selecionados: [] });
            }
        }

        // Reuniões Online: Sábado
        if (gerarSabado && diaSemana === 'sábado') {
            dias.push({ data: new Date(d), tipo: 'Sábado', selecionados: [] });
        }

        // Oração no WhatsApp: Todos os dias
        if (gerarOração) {
            dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp', selecionados: [] });
        }
    }

    // Contador de participações
    const participacoes = {};
    membros.forEach(m => participacoes[m.nome] = 0);

    // Geração da escala
    dias.forEach(dia => {
        const membrosDisponiveis = membros.filter(m => {
            const restricaoTemp = restricoes.some(r => r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim);
            const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
            return !restricaoTemp && !restricaoPerm;
        });

        const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : (dia.tipo === 'Sábado' ? 1 : quantidadeCultos);
        if (membrosDisponiveis.length < qtdNecessaria) return;

        let selecionados = [];

        if (qtdNecessaria === 1) {
            const candidatos = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes);
            if (candidatos.length > 0) {
                selecionados = candidatos;
            }
        } else {
            const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes)[0];
            if (!primeiro) return;

            const membrosCompatíveis = membrosDisponiveis.filter(m =>
                m.nome !== primeiro.nome && (
                    m.genero === primeiro.genero ||
                    m.conjuge === primeiro.nome ||
                    primeiro.conjuge === m.nome
                )
            );

            const segundo = selecionarMembrosComAleatoriedade(membrosCompatíveis, 1, participacoes)[0];
            if (segundo) {
                selecionados = [primeiro, segundo];
            }
        }

        if (selecionados.length === qtdNecessaria) {
            dia.selecionados = selecionados;
            selecionados.forEach(m => participacoes[m.nome]++);
        }
    });

    // Revisar a escala
    revisarEscala(dias, participacoes);

    // Montar o HTML da escala
    let escalaHTML = '<ul>';
    dias.forEach(dia => {
        if (dia.selecionados.length > 0) {
            escalaHTML += `<li>${dia.data.toLocaleDateString()} - ${dia.tipo}: ${dia.selecionados.map(m => m.nome).join(', ')}</li>`;
        }
    });
    escalaHTML += '</ul>';
    resultado.innerHTML += escalaHTML;

    // Relatório de participações
    let relatorio = '<h4>Relatório de Participações</h4>';
    for (const [nome, count] of Object.entries(participacoes)) {
        relatorio += `<p>${nome}: ${count} participações</p>`;
    }
    resultado.innerHTML += relatorio;
});


// --- Funções de Exportar/Importar/Inicializar (sem alterações substanciais) ---


function exportarEscalaXLSX() {
    const wb = XLSX.utils.book_new();
    const dadosEscala = [['Data', 'Tipo', 'Pessoa 1', 'Pessoa 2']];
    document.querySelectorAll('#resultadoEscala ul li').forEach(li => {
        const [dataTipo, pessoas] = li.textContent.split(': ');
        const [data, tipo] = dataTipo.split(' - ');
        const nomes = pessoas.split(', ');
        dadosEscala.push([data, tipo, nomes[0], nomes[1] || '']);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala');
    XLSX.writeFile(wb, 'escala.xlsx');
}

function exportarDados() {
    const dados = { membros, restricoes, restricoesPermanentes };
    const json = JSON.stringify(dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_escala.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            membros = dados.membros || [];
            restricoes = dados.restricoes || [];
            restricoesPermanentes = dados.restricoesPermanentes || [];
            atualizarListaMembros();
            atualizarSelectMembros();
            atualizarListaRestricoes();
            atualizarListaRestricoesPermanentes();
            salvarDados();
            alert('Dados importados com sucesso!');
        } catch (error) {
            alert('Erro ao importar dados: ' + error.message);
        }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    showTab('cadastro');
});

