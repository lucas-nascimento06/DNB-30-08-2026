// ARQUIVO: bot/codigos/handlers/command/ajudaDcHandler.js
// (mesma pasta onde já ficam dcHandler.js, dcTransferHandler.js, leilaoHandler.js, etc.)

// content = texto da mensagem, ex: "#lcmd"
export async function handleAjudaDcCommand(sock, message, content) {
    const from = message.key.remoteJid;

    const lowerContent = content.toLowerCase().trim();
    const gatilhos = ['#lcmd', '#comandos', '#ajuda', '#ajudadc', '#dchelp'];
    if (!gatilhos.includes(lowerContent)) return false;

    const texto =
        `📜 *COMANDOS DO DC E DO LEILÃO — DAMAS COINS* 💰\n` +
        `_Envie_ *#lcmd* _a qualquer momento pra ver essa lista de novo._\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +

        `🪙 *#dc*\n` +
        `Mostra quanto DC você tem guardado.\n` +
        `_Quem pode usar: qualquer um_\n\n` +

        `💸 *#emprestar @pessoa <valor>*\n` +
        `Manda uma parte do seu DC pra outra pessoa (marcando ela com @).\n` +
        `_Quem pode usar: qualquer um_\n\n` +

        `🔨 *#leilao <valor>dc*\n` +
        `Cria um leilão: manda a foto do item com essa legenda, e o bot abre o leilão com um código.\n` +
        `_Quem pode usar: somente admin_\n\n` +

        `✋ *#lance <valor>dc*\n` +
        `Dá um lance no leilão. Pode responder a foto do leilão com esse comando, ou mandar direto com o código: *#lance <valor>dc cod<código>*\n` +
        `_Quem pode usar: qualquer um_\n\n` +

        `🏁 *#fl*\n` +
        `Encerra o leilão (responda a foto ou a última confirmação). Ou mande direto com o código: *#fl cod<código>*\n` +
        `_Quem pode usar: somente admin_\n\n` +

        `🔄 *#resetardc*\n` +
        `Zera o DC de todo mundo e apaga todo o histórico.\n` +
        `_Quem pode usar: somente admin_\n\n` +

        `━━━━━━━━━━━━━━━━━━\n` +
        `💬 Cada mensagem sua no grupo rende *1 DC*, mas pode levar alguns segundos pra aparecer no saldo (é gravado a cada 30s).`;

    try {
        await sock.sendMessage(from, { text: texto }, { quoted: message });
    } catch (err) {
        console.error('[handleAjudaDcCommand] Erro:', err.message);
    }

    return true;
}