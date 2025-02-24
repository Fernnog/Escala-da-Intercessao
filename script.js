let membros = [];
let restricoes = [];

// Mostrar/esconder abas
function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// Exibir campo de cônjuge
function toggleConjuge() {
    const conjugeField = document.getElementById('conjugeField');
    conjugeField.style.display = document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

// Cadastro de Membros
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
    e.target.reset();
    toggleConjuge();
});

function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    lista.innerHTML = membros.map(m => `<li>${m.nome} (${m.genero}) ${m.conjuge ? '- Cônjuge: ' + m.conjuge : ''}</li>`).join('');
}

function atualizarSelectMembros() {
    const select = document.getElementById('membroRestricao');
    select.innerHTML = '<option value="">Selecione</option>' + membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
}

// Cadastro de Restrições
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
    e.target.reset();
});

function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    lista.innerHTML = restricoes.map(r => `<li>${r.membro}: ${r.inicio.toLocaleDateString()} a ${r.fim.toLocaleDateString()}</li>`).join('');
}

// Geração da Escala
document.getElementById('formEscala').addEventListener('submit', (e) => {
    e.preventDefault();
    gerarEscala();
});

function gerarEscala() {
    const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
    const resultado = document.getElementById('resultadoEscala');
    resultado.innerHTML = '<h3>Escala Gerada - Fevereiro 2025</h3>';

    // Dias de culto (Quarta e Domingo) e Sábado
    const diasCultos = [
        { dia: 5, tipo: 'Quarta' }, { dia: 9, tipo: 'Domingo Manhã' }, { dia: 9, tipo: 'Domingo Noite' },
        { dia: 12, tipo: 'Quarta' }, { dia: 16, tipo: 'Domingo Manhã' }, { dia: 16, tipo: 'Domingo Noite' },
        { dia: 19, tipo: 'Quarta' }, { dia: 23, tipo: 'Domingo Manhã' }, { dia: 23, tipo: 'Domingo Noite' },
        { dia: 26, tipo: 'Quarta' }
    ];
    const diasSabado = [1, 8, 15, 22];

    // Escala para cultos (Quarta e Domingo)
    let escalaCultos = '<h4>Cultos (Quarta e Domingo)</h4>';
    diasCultos.forEach(({ dia, tipo }) => {
        const dataAtual = new Date(2025, 1, dia);
        const disponiveis = membros.filter(m => !restricoes.some(r => r.membro === m.nome && dataAtual >= r.inicio && dataAtual <= r.fim));

        if (disponiveis.length === 0) {
            escalaCultos += `<p>${tipo} ${dia}: Ninguém disponível</p>`;
            return;
        }

        if (quantidadeCultos === 1) {
            const pessoa = disponiveis[Math.floor(Math.random() * disponiveis.length)];
            escalaCultos += `<p>${tipo} ${dia}: ${pessoa.nome}</p>`;
        } else {
            const pessoa1 = disponiveis[Math.floor(Math.random() * disponiveis.length)];
            let pessoa2;

            if (pessoa1.conjuge && disponiveis.some(m => m.nome === pessoa1.conjuge)) {
                pessoa2 = disponiveis.find(m => m.nome === pessoa1.conjuge);
            } else {
                const mesmaGenero = disponiveis.filter(m => m.genero === pessoa1.genero && m.nome !== pessoa1.nome);
                pessoa2 = mesmaGenero.length > 0 ? mesmaGenero[Math.floor(Math.random() * mesmaGenero.length)] : null;
            }

            escalaCultos += `<p>${tipo} ${dia}: ${pessoa1.nome} ${pessoa2 ? 'e ' + pessoa2.nome : '(Ninguém disponível para o par)'}</p>`;
        }
    });

    // Escala para sábado (fixa em 1 pessoa)
    let escalaSabado = '<h4>Reuniões Online (Sábado)</h4>';
    diasSabado.forEach(dia => {
        const dataAtual = new Date(2025, 1, dia);
        const disponiveis = membros.filter(m => !restricoes.some(r => r.membro === m.nome && dataAtual >= r.inicio && dataAtual <= r.fim));
        const pessoa = disponiveis.length > 0 ? disponiveis[Math.floor(Math.random() * disponiveis.length)] : null;
        escalaSabado += `<p>Sábado ${dia}: ${pessoa ? pessoa.nome : 'Ninguém disponível'}</p>`;
    });

    resultado.innerHTML += escalaCultos + escalaSabado;
}

// Mostrar a primeira aba por padrão
showTab('cadastro');
