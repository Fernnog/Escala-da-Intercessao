// js/html-exporter.js

import { escalaAtual } from './ui.js';

/**
 * Converte a imagem do logo local para Base64.
 * Isso permite que a imagem seja exibida corretamente na nova aba (blob URL)
 * sem depender de caminhos relativos que podem quebrar.
 */
async function getLogoBase64() {
    try {
        // ALTERAÇÃO PRIORIDADE 1: Caminho do logo atualizado para 'image/logo_CN.png'
        const response = await fetch('image/logo_CN.png');
        if (!response.ok) throw new Error('Imagem não encontrada');
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Não foi possível carregar o logo para o relatório:', e);
        return ''; // Retorna vazio se falhar, permitindo que o relatório seja gerado sem logo
    }
}

/**
 * Gera e abre um relatório HTML estilizado em uma nova aba.
 */
export async function gerarRelatorioHTML() {
    if (!escalaAtual || escalaAtual.length === 0) {
        alert('Não há escala gerada na tela para exportar.');
        return;
    }

    // 1. Determina o título do Arquivo (Nome da aba/PDF) baseado na data da escala
    const primeiraData = escalaAtual[0].data;
    const nomeMes = primeiraData.toLocaleString('pt-BR', { month: 'long' });
    const ano = primeiraData.getFullYear();
    const tituloArquivo = `Escala - ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${ano}`;

    // 2. Carrega o logo
    const logoBase64 = await getLogoBase64();

    // 3. Mapeamento de Cores por Turno (Tons Pastéis)
    const coresTurno = {
        'Quarta': '#e0f7fa',          // Azul Claro
        'Domingo Manhã': '#fff3cd',   // Amarelo Claro
        'Domingo Noite': '#e8daef',   // Roxo Claro
        'Sábado': '#d4edda',          // Verde Claro
        'Oração no WhatsApp': '#ffeeba' // Laranja Claro
    };

    // 4. Monta as linhas da tabela
    const rows = escalaAtual.map(dia => {
        const dataFormatada = dia.data.toLocaleDateString('pt-BR');
        const diaSemanaTexto = dia.data.toLocaleDateString('pt-BR', { weekday: 'long' });
        
        // Estilização dos Nomes com separador fino
        const nomesHTML = dia.selecionados.map((m, index, arr) => {
            let nomeDisplay = m.nome;
            if (m.isVaga) return '<div class="name-item vaga">(Vaga em Aberto)</div>';
            if (m.isConvidado) nomeDisplay += ' <small>(Convidado)</small>';
            
            // Adiciona classe 'last' se for o último para remover a borda
            const classeExtra = index === arr.length - 1 ? 'last' : '';
            return `<div class="name-item ${classeExtra}">${nomeDisplay}</div>`;
        }).join('');

        const corFundoTurno = coresTurno[dia.tipo] || '#f8f9fa';

        return `
            <tr>
                <td style="text-align: center;">
                    <strong>${dataFormatada}</strong><br>
                    <span style="font-size: 0.85em; color: #666; text-transform: capitalize;">${diaSemanaTexto}</span>
                </td>
                <td style="background-color: ${corFundoTurno}; font-weight: bold; color: #444;">
                    ${dia.tipo}
                </td>
                <td style="padding: 0;"> <!-- Padding 0 para que as divs internas controlem o espaçamento -->
                    <div class="names-container">
                        ${nomesHTML}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // 5. Monta o HTML Completo
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${tituloArquivo}</title> <!-- Define o nome do PDF -->
        <style>
            body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                padding: 20px; 
                background: #fff; 
                color: #333;
            }
            .report-container { 
                width: 100%;
                max-width: 1000px; 
                margin: 0 auto; 
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                border: 1px solid #dee2e6; 
                margin-top: 20px;
            }
            
            /* Cabeçalho */
            .header-table { width: 100%; margin-bottom: 20px; border: none; }
            .header-logo img { max-height: 80px; }
            .header-text { text-align: center; }
            .header-text h1 { margin: 0; font-size: 22px; text-transform: uppercase; color: #2c3e50; }
            .header-text h2 { margin: 5px 0 0 0; font-size: 16px; color: #7f8c8d; font-weight: normal; }

            /* Tabela Principal */
            th { 
                background-color: #2c3e50; 
                color: white; 
                padding: 12px; 
                text-align: left; 
                font-size: 14px; 
                text-transform: uppercase; 
                border: 1px solid #2c3e50;
            }
            td { 
                border: 1px solid #dee2e6; 
                padding: 10px; 
                vertical-align: middle;
            }
            
            /* Estilo dos Nomes */
            .names-container { padding: 5px; }
            .name-item {
                padding: 6px 0;
                border-bottom: 1px solid #e9ecef; /* Linha fina e delicada */
                font-size: 15px;
            }
            .name-item.last { border-bottom: none; }
            .name-item.vaga { color: #dc3545; font-style: italic; }
            
            /* Rodapé */
            .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 11px;
                color: #999;
                border-top: 1px solid #eee;
                padding-top: 10px;
            }

            @media print {
                body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                th { background-color: #2c3e50 !important; color: white !important; }
                /* Força a impressão das cores de fundo */
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <!-- Cabeçalho Layout Tabela para Alinhamento -->
            <table class="header-table" style="border: none;">
                <tr style="background: none;">
                    <td style="width: 100px; border: none; padding: 0;" class="header-logo">
                        ${logoBase64 ? `<img src="${logoBase64}">` : ''}
                    </td>
                    <td style="border: none; text-align: center;" class="header-text">
                        <h1>Ministério de Intercessão</h1>
                        <h2>${tituloArquivo}</h2>
                    </td>
                    <td style="width: 100px; border: none;"></td> <!-- Espaçador para equilibrar logo -->
                </tr>
            </table>

            <table>
                <thead>
                    <tr>
                        <th style="width: 120px; text-align: center;">Data</th>
                        <th style="width: 150px;">Turno</th>
                        <th>Intercessores Escalados</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <div class="footer">
                Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
            </div>
        </div>

        <script>
            // MELHORIA: Aciona a impressão automaticamente ao carregar
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            };
        </script>
    </body>
    </html>
    `;

    // 6. Abre a nova janela e escreve o conteúdo
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    } else {
        alert('O bloqueador de pop-ups impediu a abertura do relatório. Por favor, permita pop-ups para este site.');
    }
}
