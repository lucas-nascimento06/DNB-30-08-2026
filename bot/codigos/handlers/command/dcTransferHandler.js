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

// 🔧 Resolve o JID da pessoa MARCADA (@) para o número de telefone real.
// O WhatsApp entrega o mentionedJid como LID (ex: 110243874902093@lid),
// não como o número de telefone — por isso é preciso buscar nos metadados
// do grupo o número real (participantAlt/jid) correspondente a esse LID.
async function resolverNumeroRealDoMencionado(sock, groupId, mentionedJid) {
    // Se já vier como número de telefone normal, usa direto
    if (mentionedJid.endsWith('@s.whatsapp.net')) {
        return extractDigits(mentionedJid);
    }

    try {
        const meta = await sock.groupMetadata(groupId);
        const participante = meta.participants.find(p => p.id === mentionedJid);

        // Baileys pode expor o número real em campos diferentes conforme a versão
        const numeroReal =
            participante?.jid ||
            participante?.phoneNumber ||
            participante?.pn ||
            participante?.participantAlt;

        if (numeroReal) return extractDigits(numeroReal);
    } catch (err) {
        console.error('[resolverNumeroRealDoMencionado] Erro ao buscar metadata:', err.message);
    }

    // Fallback: não conseguiu resolver, usa o LID mesmo (não ideal, mas evita travar)
    console.warn(`⚠️ Não foi possível resolver número real do LID ${mentionedJid}, usando LID como fallback.`);
    return extractDigits(mentionedJid);
}

export async function dcTransferHandler(sock, message, content) {
    const from = message.key.remoteJid;

    try {
        // 1️⃣ Descobrir quem está mandando
        const remetenteCompleto = getNumeroReal(message);
        const remetenteId = extractDigits(remetenteCompleto);

        // 2️⃣ Descobrir quem foi marcado (@)
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (!mentionedJid) {
            await sock.sendMessage(from, {
                text: '⚠️ Marque a pessoa que vai receber. Ex: *#emprestar @pessoa 2*'
            }, { quoted: message });
            return;
        }

        const destinatarioId = await resolverNumeroRealDoMencionado(sock, from, mentionedJid);

        if (destinatarioId === remetenteId) {
            await sock.sendMessage(from, {
                text: '⚠️ Você não pode transferir DC para você mesma(o)!'
            }, { quoted: message });
            return;
        }

        // 3️⃣ Extrair o valor do texto (ex: "#emprestar @pessoa 2")
        // ⚠️ FIX: removemos o token da menção (@<lid/telefone>) ANTES de procurar
        // o valor. Sem isso, o regex de "pegar os últimos dígitos do texto" podia
        // grudar no número gigante do LID da pessoa marcada (ex: transferir
        // "12215210321624412 DC" em vez do valor real digitado).
        const contentSemMencao = content.replace(/@\S+/g, ' ').trim();
        const match = contentSemMencao.match(/(\d+(?:[.,]\d+)?)\s*$/);
        if (!match) {
            await sock.sendMessage(from, {
                text: '⚠️ Informe o valor. Ex: *#emprestar @pessoa 2*'
            }, { quoted: message });
            return;
        }

        const valor = parseFloat(match[1].replace(',', '.'));

        if (isNaN(valor) || valor <= 0) {
            await sock.sendMessage(from, {
                text: '⚠️ Valor inválido.'
            }, { quoted: message });
            return;
        }

        // 4️⃣ Conferir saldo do remetente
        const saldoResult = await pool.query(
            `SELECT saldo FROM damas_dc_wallets WHERE user_id = $1`,
            [remetenteId]
        );

        const saldoAtual = Number(saldoResult.rows[0]?.saldo || 0);

        if (saldoAtual < valor) {
            await sock.sendMessage(from, {
                text: `❌ Saldo insuficiente! Você tem *${saldoAtual.toLocaleString('pt-BR')} DC*, e tentou transferir *${valor} DC*.`
            }, { quoted: message });
            return;
        }

        // 5️⃣ Transação: tira de um, dá pro outro (com client.query para garantir consistência)
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `UPDATE damas_dc_wallets SET saldo = saldo - $1, atualizado_em = NOW() WHERE user_id = $2`,
                [valor, remetenteId]
            );

            await client.query(
                `INSERT INTO damas_dc_wallets (user_id, saldo)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id)
                 DO UPDATE SET saldo = damas_dc_wallets.saldo + $2, atualizado_em = NOW()`,
                [destinatarioId, valor]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        // 6️⃣ Confirmar novo saldo do remetente
        const novoSaldoResult = await pool.query(
            `SELECT saldo FROM damas_dc_wallets WHERE user_id = $1`,
            [remetenteId]
        );
        const novoSaldo = Number(novoSaldoResult.rows[0]?.saldo || 0);

        // ⚠️ FIX: o "mentions" precisa usar o MESMO número que aparece no texto
        // (@${destinatarioId}). Antes estava passando o mentionedJid cru (LID),
        // que não bate com o número real mostrado no texto — por isso o WhatsApp
        // não conseguia resolver o nome do contato e exibia só o número puro.
        await sock.sendMessage(from, {
            text: `💸 Transferência realizada!\n\n` +
                  `Valor: *${valor.toLocaleString('pt-BR')} DC*\n` +
                  `Para: @${destinatarioId}\n` +
                  `Seu saldo agora: *${novoSaldo.toLocaleString('pt-BR')} DC*`,
            mentions: [`${destinatarioId}@s.whatsapp.net`]
        }, { quoted: message });

    } catch (err) {
        console.error('[dcTransferHandler] Erro:', err.message);
        await sock.sendMessage(from, {
            text: '❌ Erro ao processar a transferência de DC.'
        }, { quoted: message });
    }
}