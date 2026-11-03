
export const STATUS_PERMITIDOS = [
    "Pendente",
    "Em andamento",
    "Concluída"
];

export function validarStatus(status) {
    if (typeof status !== "string") {
        return false;
    }

    return STATUS_PERMITIDOS.includes(status);
}
