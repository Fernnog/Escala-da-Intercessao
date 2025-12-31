// js/html-exporter.js

import { escalaAtual } from './ui.js';

async function getLogoBase64() {
    try {
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
        return '';
    }
}

export async function gerarRelatorioHTML() {
    if (!escalaAtual || escalaAtual.length === 0) {
        alert('Não há escala gerada na tela para exportar.');
        return;
    }

    // 1. Geração Dinâmica do Nome do Arquivo
    const selectMes = document.getElementById('mesEscala');
    const nomeMes = selectMes.options[selectMes.selectedIndex].text;
    const ano = document.getElementById('anoEscala').value;
    const nomeArquivoOficial = `Escala_${ano}_${nomeMes}`;

    const logoBase64 = await getLogoBase64();

    // 2. Configuração de Cores por Turno (Cultura de Turnos)
    const estiloTurnos = {
        'Quarta': { bg: '#eef6ff', border: '#4682b4', color: '#1a3850' },
        'Domingo Manhã': { bg: '#fffdf0', border: '#ffc107', color: '#856404' },
        'Domingo Noite': { bg: '#f9f5ff', border: '#6f42c1', color: '#4a148c' },
        'Sábado': { bg: '#f0fff4', border: '#28a745', color: '#155724' },
        'Oração no WhatsApp': { bg: '#fff5eb', border: '#fd7e14', color: '#7e3300' }
    };

    const rows = escalaAtual.map(dia => {
        const dataFormatada = dia.data.toLocaleDateString('pt-BR');
        
        // Ajuste: Turnos de domingo entre parênteses
        let turnoTexto = dia.tipo;
        if (dia.tipo === 'Domingo Manhã') turnoTexto = 'Domingo (Manhã)';
        else if (dia.tipo === 'Domingo Noite') turnoTexto = 'Domingo (Noite)';

        const cores = estiloTurnos[dia.tipo] || { bg: '#fff', border: '#ccc', color: '#333' };

        // Divisão fina entre os nomes
        const nomesListaHTML = dia.selecionados
            .map((m, idx) => {
                const borderStyle = idx > 0 ? 'border-top: 0.5px solid #e0e0e0; margin-top: 5px; padding-top: 5px;' : '';
                if (m.isVaga) return `<div style="${borderStyle} color: #dc3545; font-style: italic;">Vaga em Aberto</div>`;
                if (m.isConvidado) return `<div style="${borderStyle}">${m.nome} <span style="font-size: 0.8em; color: #666;">(Convidado)</span></div>`;
                return `<div style="${borderStyle}">${m.nome}</div>`;
            })
            .join('');

        return `
            <tr>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: center; width: 100px;">${dataFormatada}</td>
                <td style="border: 1px solid #ccc; padding: 10px; background-color: ${cores.bg}; border-left: 6px solid ${cores.border}; color: ${cores.color}; font-weight: bold; width: 160px;">
                    ${turnoTexto}
                </td>
                <td style="border: 1px solid #ccc; padding: 10px; font-weight: 500;">
                    ${nomesListaHTML}
                </td>
            </tr>
        `;
    }).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${nomeArquivoOficial}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background: #fff; }
            .container { max-width: 850px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f2f2f2; border: 1px solid #ccc; padding: 12px; text-align: left; text-transform: uppercase; font-size: 13px; }
            .header-table { width: 100%; margin-bottom: 20px; border: none; }
            .title-area { text-align: right; vertical-align: middle; }
            h1 { margin: 0; font-size: 22px; color: #333; }
            h2 { margin: 5px 0 0 0; font-size: 16px; color: #666; font-weight: 400; }
            @media print {
                body { padding: 0; }
                .container { max-width: 100%; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <table class="header-table">
                <tr>
                    <td style="width: 120px;">
                        ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 80px;">` : ''}
                    </td>
                    <td class="title-area">
                        <h1>Escala de Intercessores</h1>
                        <h2>Ministério de Intercessão - ${nomeArquivoOficial}</h2>
                    </td>
                </tr>
            </table>
            
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Turno</th>
                        <th>Equipe Escalada</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <p style="text-align: center; font-size: 10px; color: #999; margin-top: 30px;">
                Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
            </p>
        </div>
        <script>
            window.onload = function() {
                // Define o título da página para que o navegador sugira o nome correto ao salvar PDF
                document.title = "${nomeArquivoOficial}";
                setTimeout(() => { window.print(); }, 500);
            };
        </script>
    </body>
    </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    } else {
        alert('Por favor, permita pop-ups para gerar o relatório.');
    }
}
