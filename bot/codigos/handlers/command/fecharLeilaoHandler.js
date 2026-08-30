// ARQUIVO: bot/codigos/handlers/command/fecharLeilaoHandler.js
// (mesma pasta onde já ficam leilaoHandler.js, lanceHandler.js, etc.)

import pool from '../../../../db.js';
import { anunciosCache } from './leilaoCache.js';

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
        console.error('[fecharLeilaoHandler] Erro ao checar admin:', err.message);
        return false;
    }
}

// Se tivermos a foto do anúncio em cache, respondemos "grudado" nela.
// Se o bot reiniciou e o cache está vazio, cai no fallback (quota a mensagem do admin).
function quotedDoAnuncio(leilaoId, message) {
    const anuncioMsg = anunciosCache.get(leilaoId);
    return anuncioMsg || message;
}

// content = texto da mensagem, ex: "#fecharleilao", "#fl" (respondendo o anúncio ou
// a última confirmação de lance) ou "#fl codX7K9" de qualquer lugar do grupo
export async function handleFecharLeilaoCommand(sock, message, content) {
    const from = message.key.remoteJid;
    if (!from.endsWith('@g.us')) return false;

    const match = content.match(/^#(?:fecharleilao|fl)\b(?:\s+cod\s*(\w+))?/i);
    if (!match) return false;

    const codigoInformado = match[1] ? match[1].toUpperCase() : null;
    const stanzaId = message.message?.extendedTextMessage?.contextInfo?.stanzaId;

    if (!stanzaId && !codigoInformado) {
        await sock.sendMessage(from, {
            text: '⚠️ Pra fechar, use *#fl cod<código>* ou responda a mensagem do leilão (ou do último lance) com *#fl*.'
        }, { quoted: message });
        return true;
    }

    const remetenteCompleto = getNumeroReal(message);
    const adminId = extractDigits(remetenteCompleto);

    const ehAdmin = await isAdmin(sock, from, adminId);
    if (!ehAdmin) {
        await sock.sendMessage(from, {
            text: '🚫 Só administradores podem fechar leilões.'
        }, { quoted: message });
        return true;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Aceita fechar por código, ou por reply tanto no anúncio quanto na última
        // confirmação de lance (igual o #lance já aceita pra dar lance).
        let leilaoResult;
        if (codigoInformado) {
            leilaoResult = await client.query(
                `SELECT * FROM damas_dc_leiloes
                 WHERE codigo = $1 AND grupo_id = $2 AND status = 'aberto'
                 FOR UPDATE`,
                [codigoInformado, from]
            );
        } else {
            leilaoResult = await client.query(
                `SELECT l.* FROM damas_dc_leiloes l
                 JOIN damas_dc_leiloes_mensagens m ON m.leilao_id = l.id
                 WHERE m.message_id = $1 AND l.grupo_id = $2 AND l.status = 'aberto'
                 FOR UPDATE OF l`,
                [stanzaId, from]
            );
        }

        if (leilaoResult.rowCount === 0) {
            await client.query('ROLLBACK');
            const texto = codigoInformado
                ? `⚠️ Não encontrei nenhum leilão aberto com o código *${codigoInformado}*.`
                : '⚠️ Esse leilão não está mais aberto.';
            await sock.sendMessage(from, { text: texto }, { quoted: message });
            return true;
        }

        const leilao = leilaoResult.rows[0];
        const quoted = { quoted: quotedDoAnuncio(leilao.id, message) };

        // Sem lances -> fecha e avisa, sem transferir nada
        if (!leilao.lider_id) {
            await client.query(
                `UPDATE damas_dc_leiloes SET status = 'fechado', fechado_em = NOW() WHERE id = $1`,
                [leilao.id]
            );
            await client.query('COMMIT');
            await sock.sendMessage(from, {
                text: `🔨 Leilão [${leilao.codigo}] encerrado sem nenhum lance.`
            }, quoted);
            anunciosCache.delete(leilao.id);
            return true;
        }

        // Confere de novo o saldo do líder (pode ter gastado DC em outro lugar nesse meio tempo)
        const saldoResult = await client.query(
            `SELECT saldo FROM damas_dc_wallets WHERE user_id = $1 FOR UPDATE`,
            [leilao.lider_id]
        );
        const saldoLider = Number(saldoResult.rows[0]?.saldo || 0);
        const valorFinal = Number(leilao.valor_atual);

        if (saldoLider < valorFinal) {
            // Vencedor não tem mais saldo -> fecha sem transferir, fica registrado
            await client.query(
                `UPDATE damas_dc_leiloes SET status = 'fechado', fechado_em = NOW() WHERE id = $1`,
                [leilao.id]
            );
            await client.query('COMMIT');
            await sock.sendMessage(from, {
                text: `🔨 Leilão [${leilao.codigo}]: @${leilao.lider_id} venceu com ${valorFinal.toLocaleString('pt-BR')} DC ` +
                      `mas não tem mais saldo suficiente. Transferência cancelada.`,
                mentions: [`${leilao.lider_id}@s.whatsapp.net`]
            }, quoted);
            anunciosCache.delete(leilao.id);
            return true;
        }

        // Transfere o DC: tira do vencedor, dá pro admin que criou o leilão
        await client.query(
            `UPDATE damas_dc_wallets SET saldo = saldo - $1, atualizado_em = NOW() WHERE user_id = $2`,
            [valorFinal, leilao.lider_id]
        );
        await client.query(
            `INSERT INTO damas_dc_wallets (user_id, saldo)
             VALUES ($1, $2)
             ON CONFLICT (user_id)
             DO UPDATE SET saldo = damas_dc_wallets.saldo + $2, atualizado_em = NOW()`,
            [leilao.admin_id, valorFinal]
        );

        await client.query(
            `UPDATE damas_dc_leiloes SET status = 'fechado', fechado_em = NOW() WHERE id = $1`,
            [leilao.id]
        );

        await client.query('COMMIT');

        await sock.sendMessage(from, {
            text: `👏🍻 *DAMAS* 💃🔥 *DA* *NIGHT* 💃🎶🍾🍸\n\n` +
                  `🏆 *LEILÃO [${leilao.codigo}] ENCERRADO!* 🏆\n\n` +
                  `🎉 Vencedor: @${leilao.lider_id}\n` +
                  `💰 Arremate: *${valorFinal.toLocaleString('pt-BR')} DC*\n\n` +
                  `😂 *PARABÉNS... OU BOA SORTE!* 😂\n\n` +
                  `👑 O arremate foi confirmado!\n` +
                  `Durante *3 dias*, o(a) arrematado(a) será o(a) “servo(a)” do vencedor! 🫡🤣\n\n` +
                  `⏳ *Serão 3 dias de ordens, desafios e muita zoeira — tudo na brincadeira, hein! 😈*\n\n` +
                  `📢 *REGRA DA BRINCADEIRA:*\n` +
                  `🚫 Nada de PV!\n` +
                  `🚫 Nada fora do grupo!\n` +
                  `✅ Tudo acontece *SOMENTE AQUI NO GRUPO!* 🍻🔥\n\n` +
                  `💸 Valor transferido para o organizador do leilão.\n\n` +
                  `🔥 *QUE COMECE A RESENHA!* 😂💃🍾`,
            mentions: [`${leilao.lider_id}@s.whatsapp.net`]
        }, quoted);

        anunciosCache.delete(leilao.id);
        return true;

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[handleFecharLeilaoCommand] Erro:', err.message);
        await sock.sendMessage(from, {
            text: '❌ Erro ao fechar o leilão.'
        }, { quoted: message });
        return true;
    } finally {
        client.release();
    }
}