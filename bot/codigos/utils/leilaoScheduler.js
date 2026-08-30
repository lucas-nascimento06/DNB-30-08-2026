// ARQUIVO: bot/codigos/utils/leilaoScheduler.js
// (mesma pasta onde já fica confissoesScheduler.js)

import pool from '../../../db.js';
import fs from 'fs';

const INTERVALO_MS = 30 * 1000; // confere a cada 30s

async function abrirLeiloesPendentes(sock) {
    const { rows } = await pool.query(
        `SELECT * FROM damas_dc_leiloes WHERE status = 'pendente' AND abre_em <= NOW()`
    );

    for (const leilao of rows) {
        try {
            const buffer = fs.readFileSync(leilao.foto_path);

            const sentMsg = await sock.sendMessage(leilao.grupo_id, {
                image: buffer,
                caption: `🔨 Leilão #${leilao.id} aberto!\n` +
                         `Lance inicial: ${Number(leilao.valor_inicial).toLocaleString('pt-BR')} DC\n` +
                         `Dê seu lance respondendo esta mensagem com *#lance <valor>dc*\n` +
                         `Encerra às 23h de hoje!`
            });

            await pool.query(
                `UPDATE damas_dc_leiloes SET status = 'aberto', anuncio_message_id = $1 WHERE id = $2`,
                [sentMsg.key.id, leilao.id]
            );

            console.log(`🔨 Leilão #${leilao.id} aberto no grupo ${leilao.grupo_id}`);
        } catch (err) {
            console.error(`[leilaoScheduler] Erro ao abrir leilão #${leilao.id}:`, err.message);
        }
    }
}

async function fecharLeiloesExpirados(sock) {
    const { rows } = await pool.query(
        `SELECT * FROM damas_dc_leiloes WHERE status = 'aberto' AND fecha_em <= NOW()`
    );

    for (const leilao of rows) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Se ninguém deu lance válido, lider_id fica null -> sem vencedor
            if (!leilao.lider_id) {
                await client.query(
                    `UPDATE damas_dc_leiloes SET status = 'fechado' WHERE id = $1`,
                    [leilao.id]
                );
                await client.query('COMMIT');
                await sock.sendMessage(leilao.grupo_id, {
                    text: `⏰ Leilão #${leilao.id} encerrado sem lances. Nenhum vencedor.`
                });
                continue;
            }

            // Confere de novo o saldo do líder (pode ter gastado DC em outro lugar nesse meio tempo)
            const saldoResult = await client.query(
                `SELECT saldo FROM damas_dc_wallets WHERE user_id = $1`,
                [leilao.lider_id]
            );
            const saldoLider = Number(saldoResult.rows[0]?.saldo || 0);
            const valorFinal = Number(leilao.valor_atual);

            if (saldoLider < valorFinal) {
                // Vencedor não tem mais saldo -> fecha sem transferir, fica registrado
                await client.query(
                    `UPDATE damas_dc_leiloes SET status = 'fechado' WHERE id = $1`,
                    [leilao.id]
                );
                await client.query('COMMIT');
                await sock.sendMessage(leilao.grupo_id, {
                    text: `⏰ Leilão #${leilao.id}: @${leilao.lider_id} venceu com ${valorFinal.toLocaleString('pt-BR')} DC ` +
                          `mas não tem mais saldo suficiente. Transferência cancelada.`,
                    mentions: [`${leilao.lider_id}@s.whatsapp.net`]
                });
                continue;
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
                `UPDATE damas_dc_leiloes SET status = 'fechado' WHERE id = $1`,
                [leilao.id]
            );

            await client.query('COMMIT');

            await sock.sendMessage(leilao.grupo_id, {
                text: `🏆 Leilão #${leilao.id} encerrado!\n` +
                      `Vencedor: @${leilao.lider_id} com ${valorFinal.toLocaleString('pt-BR')} DC\n` +
                      `💸 Valor transferido para o organizador do leilão.`,
                mentions: [`${leilao.lider_id}@s.whatsapp.net`]
            });

            console.log(`🏆 Leilão #${leilao.id} fechado, vencedor ${leilao.lider_id}`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[leilaoScheduler] Erro ao fechar leilão #${leilao.id}:`, err.message);
        } finally {
            client.release();
        }
    }
}

export function iniciarLeilaoScheduler(sock) {
    setInterval(() => {
        abrirLeiloesPendentes(sock).catch(err => console.error('[leilaoScheduler] abrir:', err.message));
        fecharLeiloesExpirados(sock).catch(err => console.error('[leilaoScheduler] fechar:', err.message));
    }, INTERVALO_MS);

    console.log('⏱️ Leilão scheduler iniciado (checando a cada 30s)');
}