// =================================================================================
// MÓDULO DE UTILITÁRIOS (utils.js)
// Centraliza funções lógicas e de cálculo que são reutilizadas em toda a aplicação.
// =================================================================================

/**
 * Calcula a contagem de participação de cada membro com base em uma escala de dias.
 * Esta função centraliza a lógica de contagem para garantir consistência.
 * ATUALIZADO: Ignora vagas vazias (isVaga) e convidados externos (isConvidado).
 * @param {Array<object>} dias - A lista de dias da escala, cada um com um array 'selecionados'.
 * @param {Array<object>} membros - A lista completa de membros cadastrados.
 * @returns {object} Um objeto no formato justificationData, ex: { "Nome Membro": { participations: X } }.
 */
export function calculateParticipationData(dias, membros) {
    const justificationData = {};
    
    // Inicializa a contagem para todos os membros
    membros.forEach(m => {
        justificationData[m.nome] = { participations: 0 };
    });

    // Itera sobre a escala para contar as participações
    dias.forEach(dia => {
        if (!dia.selecionados) return;
        
        dia.selecionados.forEach(membro => {
            // Verifica se o membro existe e NÃO é uma vaga vazia ou convidado
            if (membro && membro.nome && !membro.isVaga && !membro.isConvidado) {
                if (justificationData[membro.nome]) {
                    justificationData[membro.nome].participations++;
                }
            }
        });
    });

    return justificationData;
}

/**
 * Calcula a distância de Levenshtein entre duas strings.
 * Usado para encontrar a correspondência mais provável para nomes digitados incorretamente.
 * Quanto menor o resultado, mais similares são as strings.
 * @param {string} str1 - A primeira string.
 * @param {string} str2 - A segunda string.
 * @returns {number} A distância de edição entre as duas strings.
 */
export function getLevenshteinDistance(str1 = '', str2 = '') {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
        track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,      // Deletion
                track[j - 1][i] + 1,      // Insertion
                track[j - 1][i - 1] + indicator, // Substitution
            );
        }
    }
    return track[str2.length][str1.length];
}
