// js/html-exporter.js

import { escalaAtual } from './ui.js';

/**
 * Converte a imagem do logo local para Base64.
 * Isso permite que a imagem seja exibida corretamente na nova aba (blob URL)
 * sem depender de caminhos relativos que podem quebrar.
 */
async function getLogoBase64() {
    try {
        const response = await fetch('image/logo.png');
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

    // 1. Identifica o tipo de escala para sugerir um título padrão
    const tipos = [...new Set(escalaAtual.map(d => d.tipo))];
    let subtituloPadrao = "ESCALA GERAL";
    
    if (tipos.includes('Oração no WhatsApp')) {
        subtituloPadrao = "ESCALA DE ORAÇÃO DIÁRIA NO GRUPO";
    } else if (tipos.includes('Sábado')) {
        subtituloPadrao = "ESCALA DE REUNIÕES ONLINE (SÁBADO)";
    } else if (tipos.includes('Quarta') || tipos.includes('Domingo Manhã')) {
        subtituloPadrao = "ESCALA DE CULTOS (QUARTA E DOMINGO)";
    }

    // MELHORIA: Permite ao usuário personalizar o título
    const tituloUsuario = prompt("Digite o título para o relatório (ou OK para o padrão):", subtituloPadrao);
    const tituloFinal = tituloUsuario !== null ? tituloUsuario : subtituloPadrao; // Se cancelar, mantém null (mas aqui tratamos como manter fluxo ou cancelar? Vamos assumir que se cancelar não gera. Não, prompt retorna null no cancel. Se usuario limpar, fica vazio. Vamos usar o valor padrão se vazio).
    // Correção lógica prompt: Se null (cancelar), aborta? Ou usa padrão? Geralmente OK usa valor. Cancel retorna null.
    if (tituloUsuario === null) return; // Usuário cancelou
    const tituloExibicao = tituloUsuario.trim() === '' ? subtituloPadrao : tituloUsuario;

    // 2. Carrega o logo
    const logoBase64 = await getLogoBase64();

    // 3. Define se mostra a coluna de Turno (Desnecessário para WhatsApp/Sábado que são diários únicos)
    const mostrarTurno = !tituloExibicao.toUpperCase().includes("ORAÇÃO DIÁRIA") && !tituloExibicao.toUpperCase().includes("SÁBADO") && !tituloExibicao.toUpperCase().includes("WHATSAPP");

    // 4. Monta as linhas da tabela
    const rows = escalaAtual.map(dia => {
        const dataFormatada = dia.data.toLocaleDateString('pt-BR');
        
        // Formata os nomes
        const nomes = dia.selecionados
            .map(m => {
                if (m.isVaga) return '<span style="color:#d9534f; font-style:italic; font-size:0.9em;">(Vaga em Aberto)</span>';
                if (m.isConvidado) return `${m.nome} <span style="font-size:0.8em; color:#666;">(Convidado)</span>`;
                return m.nome;
            })
            .join(' <br> '); // Quebra de linha para duplas fica mais organizado na tabela

        const colunaTurnoHTML = mostrarTurno ? `<td style="border: 1px solid #ccc; padding: 8px; white-space: nowrap;">${dia.tipo}</td>` : '';

        return `
            <tr>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: center; white-space: nowrap;">${dataFormatada}</td>
                ${colunaTurnoHTML}
                <td style="border: 1px solid #ccc; padding: 8px; font-weight: 600;">${nomes}</td>
            </tr>
        `;
    }).join('');

    // 5. Monta o HTML Completo
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Relatório - ${tituloExibicao}</title>
        <style>
            body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                padding: 40px; 
                background: #f0f0f0; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
            }
            .report-container { 
                max-width: 900px; 
                margin: 0 auto; 
                background: white; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                border: 2px solid #000; 
            }
            
            /* Cabeçalho Estilizado */
            .header-logo { 
                background-color: #000; 
                width: 120px; 
                text-align: center; 
                border-right: 1px solid #444; 
                padding: 10px;
            }
            .header-title { 
                background-color: #000; 
                color: #fff; 
                vertical-align: middle; 
                text-align: center; 
                padding: 15px; 
            }
            
            h1 { 
                margin: 0; 
                font-size: 24px; 
                text-transform: uppercase; 
                letter-spacing: 2px; 
                font-weight: 800; 
            }
            h2 { 
                margin: 8px 0 0 0; 
                font-size: 16px; 
                font-weight: 400; 
                color: #ddd; 
                text-transform: uppercase; 
                letter-spacing: 1px; 
            }
            
            /* Corpo da Tabela */
            th { 
                background-color: #e9ecef; 
                border: 1px solid #ccc; 
                padding: 12px; 
                text-align: left; 
                font-size: 14px; 
                text-transform: uppercase; 
            }
            td { 
                font-size: 15px; 
                color: #333; 
            }
            tr:nth-child(even) { 
                background-color: #f8f9fa; 
            }
            
            /* Rodapé */
            .footer {
                text-align: center;
                margin-top: 20px;
                color: #888;
                font-size: 11px;
                padding-bottom: 20px;
            }

            @media print {
                body { padding: 0; background: white; }
                .report-container { box-shadow: none; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <table>
                <thead>
                    <tr>
                        <td class="header-logo">
                            ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 80px; max-width: 100px; display: block; margin: auto;">` : ''}
                        </td>
                        <td class="header-title" colspan="${mostrarTurno ? 3 : 2}">
                            <h1>Ministério de Intercessão (CN Cuiabá)</h1>
                            <h2>${tituloExibicao}</h2>
                        </td>
                    </tr>
                    <tr>
                        <th style="width: 130px; text-align: center;">Data</th>
                        ${mostrarTurno ? '<th>Turno</th>' : ''}
                        <th>Intercessores Escalados</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <div class="footer">
                Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
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
