document.getElementById('textForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Impede o envio do formulário

    // Pega o valor do texto
    const texto = document.getElementById('texto').value;

    // Simula o salvamento do texto (substitua por uma requisição AJAX para o backend)
    setTimeout(() => {
        document.getElementById('mensagem').textContent = 'Texto salvo com sucesso!';
        document.getElementById('mensagem').style.color = 'green';
    }, 1000);

    // Limpa o campo de texto após salvar
    document.getElementById('texto').value = '';
});
