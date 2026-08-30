import pool from '../../../db.js';

const DC_POR_MENSAGEM = 1; // ajuste aqui quanto vale cada mensagem

const processedDC = new Set();
const CACHE_LIMIT = 200;

const TIPOS_VALIDOS = new Set([
    'conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage',
    'stickerMessage', 'audioMessage', 'voiceMessage', 'ptvMessage',
    'documentMessage', 'documentWithCaptionMessage', 'gifMessage',
]);

function extractDigits(number) {
    if (!number) return null;
    return number.replace(/@.*$/, '').replace(/\D/g, '');
}

function isProcessed(key) {
    const id = `${key.remoteJid}_${key.id}`;
    if (processedDC.has(id)) return true;
    processedDC.add(id);
    if (processedDC.size > CACHE_LIMIT) {
        const it = processedDC.values();
        for (let i = 0; i < processedDC.size - CACHE_LIMIT; i++) processedDC.delete(it.next().value);
    }
    return false;
}

function desembrulhar(msg) {
    if (msg?.ephemeralMessage?.message) return desembrulhar(msg.ephemeralMessage.message);
    if (msg?.viewOnceMessage?.message) return desembrulhar(msg.viewOnceMessage.message);
    if (msg?.viewOnceMessageV2?.message) return desembrulhar(msg.viewOnceMessageV2.message);
    if (msg?.editedMessage?.message) return desembrulhar(msg.editedMessage.message);
    return msg;
}

function getTipo(msg) {
    for (const tipo of Object.keys(msg)) {
        if (TIPOS_VALIDOS.has(tipo)) return tipo;
    }
    return null;
}

function getNumeroReal(message) {
    if (message.key.participantAlt) return message.key.participantAlt;
    if (message.key.participant) return message.key.participant;
    return null;
}

export async function trackDC(sock, message) {
    try {
        if (!message?.key?.remoteJid?.endsWith('@g.us')) return;
        if (message.key.fromMe) return;
        if (isProcessed(message.key)) return;

        let msg = message.message;
        if (!msg) return;
        msg = desembrulhar(msg);
        if (!msg) return;

        const tipo = getTipo(msg);
        if (!tipo) return;

        const numeroCompleto = getNumeroReal(message);
        if (!numeroCompleto) return;
        const numeroLimpo = extractDigits(numeroCompleto);
        if (!numeroLimpo || numeroLimpo.length < 10) return;

        const grupoId = message.key.remoteJid;
        const messageId = message.key.id;

        const inserted = await pool.query(
            `INSERT INTO damas_dc_messages (grupo_id, user_id, message_id, tipo, dc_ganho)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (grupo_id, message_id) DO NOTHING
             RETURNING id`,
            [grupoId, numeroLimpo, messageId, tipo, DC_POR_MENSAGEM]
        );

        if (inserted.rowCount === 0) return; // já contada antes

        await pool.query(
            `INSERT INTO damas_dc_wallets (user_id, saldo)
             VALUES ($1, $2)
             ON CONFLICT (user_id)
             DO UPDATE SET saldo = damas_dc_wallets.saldo + $2, atualizado_em = NOW()`,
            [numeroLimpo, DC_POR_MENSAGEM]
        );

        console.log(`💰 [DC] +${DC_POR_MENSAGEM} DC para ${numeroLimpo}`);
    } catch (err) {
        console.error('[trackDC] Erro:', err.message);
    }
}