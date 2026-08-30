// ARQUIVO: bot/codigos/handlers/command/resetDcHandler.js
// (mesma pasta onde já ficam dcHandler.js, dcTransferHandler.js, leilaoHandler.js, etc.)

import pool from '../../../../db.js';

function extractDigits(number) {
    if (!number) return null;
    return number.replace(/@.*$/, '').replace(/\D/g, '');
}

function getNumeroReal(message) {
    if (message.key.participantAlt) return message.key.participantAlt;
    if (message.key.participant) return message.key.participant;
    return message.key.remoteJid;
}

async function isAdmin(sock, groupId, userId) {
    try {
        const meta = await sock.groupMetadata(groupId);
        const participante = meta.participants.find(p => {
            const idDigits = extractDigits(p.id);
            const phoneDigits = extractDigits(p.phoneNumber);
            return idDigits === userId || phoneDigits === userId;
        });
        return participante?.admin === 'admin' || participante?.admin === 'superadmin';
    } catch (err) {
        console.error('[resetDcHandler] Erro ao checar admin:', err.message);
        return false;
    }
}

// content = texto da mensagem, ex: "#resetardc"
export async function handleResetDcCommand(sock, message, content) {
    const from = message.key.remoteJid;
    if (!from.endsWith('@g.us')) return false;

    const lowerContent = content.toLowerCase().trim();
    if (lowerContent !== '#resetardc' && lowerContent !== '#rdc') return false;

    const remetenteCompleto = getNumeroReal(message);
    const adminId = extractDigits(remetenteCompleto);

    const ehAdmin = await isAdmin(sock, from, adminId);
    if (!ehAdmin) {
        await sock.sendMessage(from, {
            text: '🚫 Só administradores podem resetar o DC do grupo.'
        }, { quoted: message });
        return true;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1) Zera as carteiras (saldo atual de todo mundo)
        const walletsResult = await client.query(
            `UPDATE damas_dc_wallets SET saldo = 0, atualizado_em = NOW() WHERE saldo != 0`
        );

        // 2) Limpa o histórico/log de DC ganho por mensagens
        //    OBS: isto apaga o log inteiro (todos os grupos).
        //    Se quiser limitar ao grupo onde o comando foi chamado, troque por:
        //    DELETE FROM damas_dc_messages WHERE grupo_id = $1  -- com [from] nos params
        const ganhoResult = await client.query(
            `DELETE FROM damas_dc_messages`
        );

        await client.query('COMMIT');

        await sock.sendMessage(from, {
            text: `🔄 *Reset completo de DC realizado!*\n\n` +
                  `💰 ${walletsResult.rowCount} carteira(s) zerada(s).\n` +
                  `🗑️ ${ganhoResult.rowCount} registro(s) de histórico apagado(s).\n\n` +
                  `💬 Bora conversar de novo no grupo pra juntar DC e disputar o próximo leilão! 🔨`
        }, { quoted: message });

        return true;

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[handleResetDcCommand] Erro:', err.message);
        await sock.sendMessage(from, {
            text: '❌ Erro ao resetar o DC. Nada foi alterado.'
        }, { quoted: message });
        return true;
    } finally {
        client.release();
    }
}