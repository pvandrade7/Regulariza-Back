export function validarCredenciais(body, cadastro = false) {
    const erros = [];
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { erros: ['Envie um objeto JSON válido.'] };
    const permitidos = cadastro ? ['nome', 'email', 'senha'] : ['email', 'senha'];
    if (Object.keys(body).some(key => !permitidos.includes(key))) erros.push('Há campos não permitidos.');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('Informe um e-mail válido.');
    if (typeof body.senha !== 'string' || body.senha.length < 8 || body.senha.length > 128) erros.push('A senha deve ter entre 8 e 128 caracteres.');
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    if (cadastro && (!nome || nome.length > 150)) erros.push('Informe um nome de até 150 caracteres.');
    return { erros, dados: { nome, email, senha: body.senha } };
}
