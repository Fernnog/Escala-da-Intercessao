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

        if (gerarCultos) {
            if (diaSemana === 'quarta-feira') dias.push({ data: new Date(d), tipo: 'Quarta' });
            if (diaSemana === 'domingo') {
                dias.push({ data: new Date(d), tipo: 'Domingo Manhã' });
                dias.push({ data: new Date(d), tipo: 'Domingo Noite' });
            }
        }
        if (gerarSabado && diaSemana === 'sábado') dias.push({ data: new Date(d), tipo: 'Sábado' });
        if (gerarOração) dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp' });
    }

    // Contador de participações
    const participacoes = {};
    membros.forEach(m => (participacoes[m.nome] = 0));
    let escalaHTML = '<ul>';

    // Função para embaralhar array (usada para aleatoriedade controlada)
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Geração da escala
    dias.forEach(dia => {
        // Filtra membros disponíveis considerando restrições
        const membrosDisponiveis = membros.filter(m => {
            const restricaoTemp = restricoes.some(
                r => r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim
            );
            const restricaoPerm = restricoesPermanentes.some(
                r => r.membro === m.nome && r.diaSemana === dia.tipo
            );
            return !restricaoTemp && !restricaoPerm;
        });

        const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : quantidadeCultos;
        if (membrosDisponiveis.length < qtdNecessaria) return;

        // Ordena por participações para priorizar os com menos escalas
        membrosDisponiveis.sort((a, b) => participacoes[a.nome] - participacoes[b.nome]);

        let selecionados = [];
        if (qtdNecessaria === 1) {
            // Para escalas de 1 pessoa, seleciona o com menos participações
            selecionados = [membrosDisponiveis[0]];
        } else if (qtdNecessaria === 2) {
            // Para escalas de 2 pessoas, seleciona apenas do mesmo gênero
            const homens = membrosDisponiveis.filter(m => m.genero === 'M');
            const mulheres = membrosDisponiveis.filter(m => m.genero === 'F');

            let pool;
            if (homens.length >= 2 && mulheres.length >= 2) {
                // Escolhe o gênero com menor média de participações
                const mediaHomens = homens.reduce((sum, m) => sum + participacoes[m.nome], 0) / homens.length;
                const mediaMulheres = mulheres.reduce((sum, m) => sum + participacoes[m.nome], 0) / mulheres.length;
                pool = mediaHomens <= mediaMulheres ? homens : mulheres;
            } else if (homens.length >= 2) {
                pool = homens;
            } else if (mulheres.length >= 2) {
                pool = mulheres;
            } else {
                return; // Não há 2 membros do mesmo gênero disponíveis
            }

            // Ordena o pool por participações e embaralha os com mesmo número para aleatoriedade
            pool.sort((a, b) => participacoes[a.nome] - participacoes[b.nome]);
            const minParticipacoes = participacoes[pool[0].nome];
            const candidatos = pool.filter(m => participacoes[m.nome] === minParticipacoes);
            shuffle(candidatos); // Aleatoriedade entre os com menos participações
            selecionados = candidatos.slice(0, 2);
        }

        if (selecionados.length === qtdNecessaria) {
            selecionados.forEach(m => participacoes[m.nome]++);
            escalaHTML += `<li>${dia.data.toLocaleDateString()} - ${dia.tipo}: ${selecionados.map(m => m.nome).join(', ')}</li>`;
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
