export async function criarEmpresa(req, res) {
    try {
        const {
            usuarioId,
            regimeJuridicoId,
            nome,
            cpf,
            cnpj,
            atividade,
            porte,
            municipio,
            estado,
            numeroFuncionarios,
            estabelecimentoFisico
        } = req.body;

        if (!nome || !atividade || !municipio || !estado) {
            return res.status(400).json({
                mensagem: "Preencha todos os campos obrigatórios."
            });
        }

        return res.status(200).json({
            mensagem: "Dados recebidos com sucesso.",
            dados: req.body
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            mensagem: "Erro interno do servidor."
        });
    }
}