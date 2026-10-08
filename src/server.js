import express from "express";
import empresaRoutes from "./routes/empresaRoutes.js";

const app = express();

app.use(express.json());

app.use("/empresas", empresaRoutes);

app.use((req, res) => {
    res.status(404).json({
        mensagem: "Rota não encontrada."
    });
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});