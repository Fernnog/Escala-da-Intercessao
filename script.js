let membros = [];
let restricoes = [];
let restricoesPermanentes = [];

// Função para alternar abas
function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

// Alternar campo de cônjuge
function toggleConjuge() {
    document.getElementById('conjugeField').style.display = 
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

// Salvar e carregar dados no localStorage
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

// Limpar todos os dados
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

// Cadastro de Membros com exclusão
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

// Cadastro de Restrições Temporárias com exclusão
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

// Cadastro de Restrições Permanentes com exclusão
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

// Geração da Escala com mês e ano
document.getElementById('formEscala').addEventListener('submit', (e) => {
    e.preventDefault();
    const gerarCultos = document.getElementById('escalaCultos').checked;
    const gerarSabado = document.getElementById('escalaSabado').checked;
    const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
    const mes = parseInt(document.getElementById('mesEscala').value);
    const ano = parseInt(document.getElementById('anoEscala').value);
    const resultado = document.getElementById('resultadoEscala');

    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0); // Último dia do mês
    resultado.innerHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3>`;

    const dias = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.toLocaleString('pt-BR', { weekday: 'long' });
        if (gerarCultos && (diaSemana === 'quarta-feira' || diaSemana === 'domingo')) {
            dias.push({ data: new Date(d), tipo: diaSemana === 'quarta-feira' ? 'Quarta' : 
                (d.getHours() < 12 ? 'Domingo Manhã' : 'Domingo Noite') });
        }
        if (gerarSabado && diaSemana === 'sábado') {
            dias.push({ data: new Date(d), tipo: 'Sábado' });
        }
    }

    const participacoes = {};
    membros.forEach(m => participacoes[m.nome] = 0);
    let escalaHTML = '<ul>';

    dias.forEach(dia => {
        const membrosDisponiveis = membros.filter(m => {
            const restricaoTemp = restricoes.some(r => r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim);
            const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
            return !restricaoTemp && !restricaoPerm;
        });

        if (membrosDisponiveis.length < quantidadeCultos) return;

        let selecionados = [];
        if (quantidadeCultos === 1 || dia.tipo === 'Sábado') {
            selecionados = [membrosDisponiveis.sort((a, b) => participacoes[a.nome] - participacoes[b.nome])[0]];
        } else {
            const candidatos = membrosDisponiveis.sort((a, b) => participacoes[a.nome] - participacoes[b.nome]);
            for (let i = 0; i < candidatos.length && selecionados.length < 2; i++) {
                if (!selecionados.length) {
                    selecionados.push(candidatos[i]);
                } else {
                    const primeiro = selecionados[0];
                    if (primeiro.genero === candidatos[i].genero || primeiro.conjuge === candidatos[i].nome || candidatos[i].conjuge === primeiro.nome) {
                        selecionados.push(candidatos[i]);
                    }
                }
            }
        }

        if (selecionados.length === (dia.tipo === 'Sábado' ? 1 : quantidadeCultos)) {
            selecionados.forEach(m => participacoes[m.nome]++);
            escalaHTML += `<li>${dia.data.toLocaleDateString()} - ${dia.tipo}: ${selecionados.map(m => m.nome).join(', ')}</li>`;
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

// Exportar Escala para XLSX
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

// Exportar e importar dados em JSON
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

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    showTab('cadastro');
});
