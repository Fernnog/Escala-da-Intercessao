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
            if (diaSemana === 'quarta-feira') {
                dias.push({ data: new Date(d), tipo: 'Quarta' });
            }
            if (diaSemana === 'domingo') {
                dias.push({ data: new Date(d), tipo: 'Domingo Manhã' });
                dias.push({ data: new Date(d), tipo: 'Domingo Noite' });
            }
        }

        if (gerarSabado && diaSemana === 'sábado') {
            dias.push({ data: new Date(d), tipo: 'Sábado' });
        }

        if (gerarOração) {
            dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp' });
        }
    }

    // Contador de participações
    const participacoes = {};
    membros.forEach(m => participacoes[m.nome] = 0);
    let escalaHTML = '<ul>';

    // Geração da escala com aleatoriedade
    dias.forEach(dia => {
        const membrosDisponiveis = membros.filter(m => {
            const restricaoTemp = restricoes.some(r => r.membro === m.nome && dia.data >= r.inicio && dia.data <= r.fim);
            const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
            return !restricaoTemp && !restricaoPerm;
        });

        const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : quantidadeCultos;
        if (membrosDisponiveis.length < qtdNecessaria) return;

        let selecionados = [];
        if (dia.tipo === 'Oração no WhatsApp') {
            const membrosShuffled = shuffle([...membrosDisponiveis]);
            selecionados = [membrosShuffled[0]];
        } else if (quantidadeCultos === 1 || dia.tipo === 'Sábado') {
            const membrosShuffled = shuffle([...membrosDisponiveis]);
            selecionados = [membrosShuffled[0]];
        } else {
            const membrosShuffled = shuffle([...membrosDisponiveis]);
            for (let i = 0; i < membrosShuffled.length && selecionados.length < 2; i++) {
                const candidato = membrosShuffled[i];
                if (selecionados.length === 0) {
                    selecionados.push(candidato);
                } else {
                    const primeiro = selecionados[0];
                    if (primeiro.genero === candidato.genero) {
                        selecionados.push(candidato);
                    }
                }
            }
        }

        if (selecionados.length === qtdNecessaria) {
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
