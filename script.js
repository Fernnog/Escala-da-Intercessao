let membros = [];
let restricoes = [];
let restricoesPermanentes = [];

// --- Funções Utilitárias ---

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

// --- Funções de Membros ---

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

// --- Funções de Restrições ---

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

// --- Funções de Cadastro ---

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

// Função auxiliar para seleção ponderada
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) {
            return i;
        }
    }
    return weights.length - 1;
}

// Função auxiliar para calcular o limite máximo de participações
function calcularLimiteMaximoParticipacoes(totalEventos, totalMembros) {
    const mediaIdeal = totalEventos / totalMembros;
    return Math.ceil(mediaIdeal) + 1; // Permite uma folga de até 1 acima da média ideal
}

// Função de seleção aleatória ponderada (ajustada para equidade)
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes, limiteMaximo) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // Filtrar membros que ainda não atingiram o limite máximo
    const candidatosElegiveis = membrosDisponiveis.filter(m => participacoes[m.nome] < limiteMaximo);
    const candidatos = candidatosElegiveis.length >= quantidadeNecessaria ? candidatosElegiveis : membrosDisponiveis;

    // Calcular pesos: dar preferência a quem tem menos participações
    const maxParticipacaoAtual = Math.max(...Object.values(participacoes));
    const pesos = candidatos.map(m => {
        const diferenca = maxParticipacaoAtual - participacoes[m.nome];
        return diferenca > 0 ? diferenca : 1;
    });
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    const pesosNormalizados = pesos.map(p => p / somaPesos);

    const selecionados = [];
    const disponiveis = [...candidatos];
    const pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indice = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indice, 1)[0];
        pesosTemp.splice(indice, 1);
        selecionados.push(membroSelecionado);
    }

    return selecionados;
}

// Função de revisão da escala (ajustada para maior equilíbrio)
function revisarEscala(dias, participacoes, limiteMaximo) {
    const maxParticipacoes = Math.max(...Object.values(participacoes));
    const minParticipacoes = Math.min(...Object.values(participacoes));

    if (maxParticipacoes - minParticipacoes > 2 || maxParticipacoes > limiteMaximo) {
        const membrosOver = Object.entries(participacoes)
            .filter(([_, count]) => count > limiteMaximo || count === maxParticipacoes)
            .map(([nome]) => nome);
        const membrosUnder = Object.entries(participacoes)
            .filter(([_, count]) => count < maxParticipacoes - 1)
            .map(([nome]) => nome);

        dias.forEach(dia => {
            dia.selecionados.forEach((membro, idx) => {
                if (membrosOver.includes(membro.nome) && participacoes[membro.nome] > limiteMaximo) {
                    const membrosDisponiveis = membros.filter(m => {
                        const restricaoTemp = restricoes.some(r =>
                            r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim
                        );
                        const restricaoPerm = restricoesPermanentes.some(r =>
                            r.membro === m.nome && r.diaSemana === dia.tipo
                        );
                        return !restricaoTemp && !restricaoPerm && m.nome !== membro.nome;
                    });

                    const substituto = membrosDisponiveis.find(m =>
                        membrosUnder.includes(m.nome) &&
                        (dia.selecionados.length === 1 ||
                            (m.genero === dia.selecionados[1 - idx].genero ||
                                m.conjuge === dia.selecionados[1 - idx].nome ||
                                dia.selecionados[1 - idx].conjuge === m.nome))
                    );

                    if (substituto) {
                        dia.selecionados[idx] = substituto;
                        participacoes[membro.nome]--;
                        participacoes[substituto.nome]++;
                    }
                }
            });
        });
    }
}

// Evento de submissão do formulário (geração da escala)
document.getElementById('formEscala').addEventListener('submit', (e) => {
    e.preventDefault();

    const gerarCultos = document.getElementById('escalaCultos').checked;
    const gerarSabado = document.getElementById('escalaSabado').checked;
    const gerarOração = document.getElementById('escalaOração').checked;
    const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
    const mes = parseInt(document.getElementById('mesEscala').value);
    const ano = parseInt(document.getElementById('anoEscala').value);
    const resultado = document.getElementById('resultadoEscala');

    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0);
    resultado.innerHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3>`;

    const dias = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.toLocaleString('pt-BR', { weekday: 'long' });
        if (gerarCultos) {
            if (diaSemana === 'quarta-feira') dias.push({ data: new Date(d), tipo: 'Quarta', selecionados: [] });
            if (diaSemana === 'domingo') {
                dias.push({ data: new Date(d), tipo: 'Domingo Manhã', selecionados: [] });
                dias.push({ data: new Date(d), tipo: 'Domingo Noite', selecionados: [] });
            }
        }
        if (gerarSabado && diaSemana === 'sábado') dias.push({ data: new Date(d), tipo: 'Sábado', selecionados: [] });
        if (gerarOração) dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp', selecionados: [] });
    }

    const participacoes = {};
    membros.forEach(m => participacoes[m.nome] = 0);
    const totalEventos = dias.reduce((sum, dia) => sum + (dia.tipo === 'Oração no WhatsApp' || dia.tipo === 'Sábado' ? 1 : quantidadeCultos), 0);
    const limiteMaximo = calcularLimiteMaximoParticipacoes(totalEventos, membros.length);

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
            const candidatos = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes, limiteMaximo);
            if (candidatos.length > 0) selecionados = candidatos;
        } else {
            const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes, limiteMaximo)[0];
            if (!primeiro) return;

            const membrosCompatíveis = membrosDisponiveis.filter(m =>
                m.nome !== primeiro.nome && (
                    m.genero === primeiro.genero ||
                    m.conjuge === primeiro.nome ||
                    primeiro.conjuge === m.nome
                )
            );

            const segundo = selecionarMembrosComAleatoriedade(membrosCompatíveis, 1, participacoes, limiteMaximo)[0];
            if (segundo) selecionados = [primeiro, segundo];
        }

        if (selecionados.length === qtdNecessaria) {
            dia.selecionados = selecionados;
            selecionados.forEach(m => participacoes[m.nome]++);
        }
    });

    revisarEscala(dias, participacoes, limiteMaximo);

    let escalaHTML = '<ul>';
    dias.forEach(dia => {
        if (dia.selecionados.length > 0) {
            escalaHTML += `<li>${dia.data.toLocaleDateString()} - ${dia.tipo}: ${dia.selecionados.map(m => m.nome).join(', ')}</li>`;
        }
    });
    escalaHTML += '</ul>';
    resultado.innerHTML += escalaHTML;

    let relatorio = '<h4>Relatório de Participações</h4>';
    for (const [nome, count] of Object.entries(participacoes)) {
        relatorio += `<p>${nome}: ${count} participações</p>`;
    }
    resultado.innerHTML += relatorio;
});

// --- Funções de Exportar/Importar ---

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

            // Converter strings de data em objetos Date para restrições temporárias
            membros = dados.membros || [];
            restricoes = (dados.restricoes || []).map(r => ({
                ...r,
                inicio: new Date(r.inicio),
                fim: new Date(r.fim)
            }));
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    showTab('cadastro');
});
