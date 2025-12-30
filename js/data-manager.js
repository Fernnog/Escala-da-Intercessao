// ARQUIVO: js/data-manager.js

// --- ESTADO DA APLICAÇÃO ---
export let membros = [];
export let restricoes = [];
export let restricoesPermanentes = [];
export let escalasSalvas = [];

// --- FUNÇÕES DE MANIPULAÇÃO DO ESTADO LOCAL (CRUD) ---

export function adicionarMembro(membro) {
    membros.push(membro);
}

export function excluirMembro(index) {
    membros.splice(index, 1);
}

export function adicionarRestricao(restricao) {
    restricoes.push(restricao);
}

export function excluirRestricao(index) {
    restricoes.splice(index, 1);
}

export function adicionarRestricaoPermanente(restricao) {
    restricoesPermanentes.push(restricao);
}

export function excluirRestricaoPermanente(index) {
    restricoesPermanentes.splice(index, 1);
}

export function adicionarEscalaSalva(escala) {
    escalasSalvas.push(escala);
}

export function excluirEscalaSalva(escalaId) {
    const index = escalasSalvas.findIndex(e => e.id === escalaId);
    if (index > -1) {
        escalasSalvas.splice(index, 1);
    }
}

export function atualizarNomeEscalaSalva(escalaId, novoNome) {
    const escala = escalasSalvas.find(e => e.id === escalaId);
    if (escala) {
        escala.nome = novoNome;
    }
}

// --- FUNÇÕES DE PERSISTÊNCIA DE DADOS (Firebase e Exportação) ---

export function salvarDados(auth, database) {
    const user = auth.currentUser;
    if (!user) return Promise.resolve(); // Retorna uma promessa para não quebrar a cadeia .then()
    const uid = user.uid;
    
    // Preparar escalas salvas para persistência (garantir datas em string)
    const escalasParaSalvar = escalasSalvas.map(escala => {
        const diasFormatados = escala.dias.map(dia => {
            let dataStr = null;
            if (dia.data instanceof Date) {
                dataStr = dia.data.toISOString();
            } else if (typeof dia.data === 'string') {
                dataStr = dia.data;
            }
            return { ...dia, data: dataStr };
        });
        return { ...escala, dias: diasFormatados };
    });

    return database.ref('users/' + uid).set({
        membros: membros,
        restricoes: restricoes,
        restricoesPermanentes: restricoesPermanentes,
        escalasSalvas: escalasParaSalvar
    });
}

export function carregarDados(auth, database, onDataLoaded) {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            // Limpa os arrays de estado ANTES de preenchê-los.
            membros.length = 0;
            restricoes.length = 0;
            restricoesPermanentes.length = 0;
            escalasSalvas.length = 0;

            if (snapshot.exists()) {
                const dados = snapshot.val();
                
                // Processa e preenche MEMBROS
                const membrosProcessados = (dados.membros || []).map(m => {
                    if (typeof m.suspensao !== 'object' || m.suspensao === null) {
                        const isSuspendedOld = !!m.suspenso;
                        m.suspensao = { cultos: isSuspendedOld, sabado: isSuspendedOld, whatsapp: isSuspendedOld };
                    }
                    return m;
                });
                membrosProcessados.forEach(membro => membros.push(membro));

                // Processa e preenche RESTRIÇÕES
                const restricoesProcessadas = dados.restricoes || [];
                restricoesProcessadas.forEach(restricao => restricoes.push(restricao));

                // Processa e preenche RESTRIÇÕES PERMANENTES
                const restricoesPermProcessadas = dados.restricoesPermanentes || [];
                restricoesPermProcessadas.forEach(restricao => restricoesPermanentes.push(restricao));
                
                // =================================================================================
                // === CORREÇÃO DE LEITURA DE DATAS (ROBUSTEZ AUMENTADA) ===
                // =================================================================================
                const escalasSalvasDoBanco = dados.escalasSalvas || [];
                
                const escalasProcessadas = escalasSalvasDoBanco.map(escala => {
                    if (escala.dias && Array.isArray(escala.dias)) {
                        const diasValidos = escala.dias
                            .map(dia => {
                                let dataConvertida = null;
                                
                                // Cenário 1: Data já é objeto Date (raro vindo de JSON, mas possível em cache)
                                if (dia.data instanceof Date) {
                                    dataConvertida = dia.data;
                                } 
                                // Cenário 2: Data é string (Padrão esperado)
                                else if (typeof dia.data === 'string') {
                                    // Tenta conversão padrão (ISO 8601)
                                    dataConvertida = new Date(dia.data);
                                    
                                    // Cenário 3: Fallback para datas mal formatadas ou antigas
                                    if (isNaN(dataConvertida.getTime())) {
                                        console.warn(`Tentando recuperar data inválida: ${dia.data}`);
                                        // Se for algo simples, tenta manter ou usar a data atual como fallback 
                                        // para não perder o registro (opcional, aqui optamos por descartar se irrecuperável)
                                    }
                                }

                                return { ...dia, data: dataConvertida };
                            })
                            // Filtro de Segurança: Só mantém dias com datas válidas
                            .filter(dia => dia.data && !isNaN(dia.data.getTime()));

                        // Se o filtro removeu tudo, loga para debug
                        if (escala.dias.length > 0 && diasValidos.length === 0) {
                            console.error(`Atenção: A escala "${escala.nome}" tinha dias, mas as datas eram inválidas e foram removidas.`);
                        }

                        return { ...escala, dias: diasValidos };
                    }
                    // Se a escala não tiver dias, retorna como está
                    return { ...escala, dias: [] }; 
                });
                
                escalasProcessadas.forEach(escala => escalasSalvas.push(escala));
                // ===============================================================================
            }
            
            onDataLoaded();
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
            onDataLoaded();
        });
}
