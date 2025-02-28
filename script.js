// Função auxiliar para calcular o limite máximo de participações
function calcularLimiteMaximoParticipacoes(totalEventos, totalMembros) {
    const mediaIdeal = totalEventos / totalMembros;
    return Math.ceil(mediaIdeal) + 1; // Permite uma folga de até 1 acima da média ideal
}

// Função de seleção aleatória ponderada (ajustada para priorizar equidade)
function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes, limiteMaximo) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // Filtrar membros que ainda não atingiram o limite máximo
    const candidatosElegiveis = membrosDisponiveis.filter(m => participacoes[m.nome] < limiteMaximo);

    // Se não houver candidatos suficientes respeitando o limite, usar todos os disponíveis
    const candidatos = candidatosElegiveis.length >= quantidadeNecessaria ? candidatosElegiveis : membrosDisponiveis;

    // Calcular pesos: dar preferência a quem tem menos participações
    const maxParticipacaoAtual = Math.max(...Object.values(participacoes));
    const pesos = candidatos.map(m => {
        const diferenca = maxParticipacaoAtual - participacoes[m.nome];
        return diferenca > 0 ? diferenca : 1; // Peso mínimo de 1 para evitar divisão por zero
    });
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    const pesosNormalizados = pesos.map(p => p / somaPesos);

    // Selecionar membros com base nos pesos
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

    // Se a diferença for maior que 2 ou exceder o limite máximo, corrigir
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

// Evento de submissão do formulário (atualizado)
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
    const fim = new Date(ano, mes + 1, 0);
    resultado.innerHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3>`;

    // Lista de dias com eventos
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

    // Contador de participações e limite máximo
    const participacoes = {};
    membros.forEach(m => participacoes[m.nome] = 0);
    const totalEventos = dias.reduce((sum, dia) => sum + (dia.tipo === 'Oração no WhatsApp' || dia.tipo === 'Sábado' ? 1 : quantidadeCultos), 0);
    const limiteMaximo = calcularLimiteMaximoParticipacoes(totalEventos, membros.length);

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

    // Revisar a escala
    revisarEscala(dias, participacoes, limiteMaximo);

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
