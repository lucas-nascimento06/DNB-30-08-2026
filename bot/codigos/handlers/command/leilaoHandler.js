// ARQUIVO: bot/codigos/handlers/command/leilaoHandler.js
// (mesma pasta onde já ficam dcHandler.js, dcTransferHandler.js, etc.)
import pool from '../../../../db.js';
import  {
  downloadMediaMessage
}
from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import  {
  anunciosCache
}
from './leilaoCache.js';
const PASTA_LEILOES = path.resolve('./bot/temp/leiloes');
if (!fs.existsSync(PASTA_LEILOES)) fs.mkdirSync(PASTA_LEILOES,  {
  recursive: true
}
);
function extractDigits(number)  {
  if (!number) return null;
  return number.replace(/@.*$/, '').replace(/\D/g, '');
}
// Tira acento pra aceitar "#leilão" e "#leilao" igual, sem mexer no resto do texto
function normalizarComando(texto)  {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
// Aceita "1200", "1.200", "1200dc", "1.200 dc", "1200,50" etc.
// Ponto seguido de exatamente 3 dígitos é tratado como separador de milhar.
function parseValorDC(bruto)  {
  let s = bruto.trim();
  if (s.includes(','))  {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  else if (s.includes('.'))  {
    const partes = s.split('.');
    if (partes[partes.length - 1].length === 3)  {
      s = partes.join('');
    }
  }
  return parseFloat(s);
}
function getNumeroReal(message)  {
  if (message.key.participantAlt) return message.key.participantAlt;
  if (message.key.participant) return message.key.participant;
  return message.key.remoteJid;
}
async function isAdmin(sock, groupId, userId)  {
  try  {
    const meta = await sock.groupMetadata(groupId);
    const participante = meta.participants.find(p =>  {
      const idDigits = extractDigits(p.id);
      const phoneDigits = extractDigits(p.phoneNumber);
      return idDigits === userId || phoneDigits === userId;
    }
    );
    return participante?.admin === 'admin' || participante?.admin === 'superadmin';
  }
  catch (err)  {
    console.error('[leilaoHandler] Erro ao checar admin:', err.message);
    return false;
  }
}
// Gera um código curto (4 caracteres, base36) garantindo que não colida com
// nenhum leilão ABERTO no mesmo grupo. Tenta algumas vezes antes de cair
// num fallback baseado em timestamp (praticamente nunca deve acontecer).
async function gerarCodigoUnico(grupoId)  {
  for (let tentativas = 0;
  tentativas < 5;
  tentativas++)  {
    const codigo = Math.random().toString(36).substring(2, 6).toUpperCase();
    const existe = await pool.query( `SELECT 1 FROM damas_dc_leiloes WHERE grupo_id = $1 AND codigo = $2 AND status = 'aberto'`, [grupoId, codigo] );
    if (existe.rowCount === 0) return codigo;
  }
  return Date.now().toString(36).toUpperCase().slice(-4);
}
// content = legenda da imagem, ex: "#leilao 1200dc" ou "#leilao 1200dc cod CADEIRA"
export async function handleLeilaoCommand(sock, message, content)  {
  const from = message.key.remoteJid;
  if (!from.endsWith('@g.us')) return false;
// "cod" com ou sem espaço antes do código: "codX7K9" ou "cod X7K9"
  const match = normalizarComando(content).match(/^#leilao\s+([\d.,]+)\s*dc\b(?:\s+cod\s*(\w+))?/i);
  if (!match) return false;
  try  {
    const remetenteCompleto = getNumeroReal(message);
    const adminId = extractDigits(remetenteCompleto);
    const ehAdmin = await isAdmin(sock, from, adminId);
    if (!ehAdmin)  {
      await sock.sendMessage(from,  {
        text: '🚫 Só administradores podem criar leilões.'
      }
      ,  {
        quoted: message
      }
      );
      return true;
    }
    const temImagem = !!message.message?.imageMessage;
    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imagemCitada = quotedMessage?.imageMessage;
    if (!temImagem && !imagemCitada)  {
      await sock.sendMessage(from,  {
        text: '⚠️ Envie a foto do item com a legenda *#leilao <valor>dc*, ou responda a foto com *#leilao <valor>dc*.'
      }
      ,  {
        quoted: message
      }
      );
      return true;
    }
    const valorInicial = parseValorDC(match[1]);
    if (isNaN(valorInicial) || valorInicial <= 0)  {
      await sock.sendMessage(from,  {
        text: '⚠️ Valor inválido. Ex: *#leilao 1200dc*'
      }
      ,  {
        quoted: message
      }
      );
      return true;
    }
// Código do leilão: usa o informado pelo admin (se veio) ou gera um automático
    const codigoInformado = match[2] ? match[2].toUpperCase() : null;
    let codigo = codigoInformado;
    if (codigo)  {
      const existe = await pool.query( `SELECT 1 FROM damas_dc_leiloes WHERE grupo_id = $1 AND codigo = $2 AND status = 'aberto'`, [from, codigo] );
      if (existe.rowCount > 0)  {
        await sock.sendMessage(from,  {
          text: `⚠️ Já existe um leilão aberto com o código *${codigo}*. Escolha outro.`
        }
        ,  {
          quoted: message
        }
        );
        return true;
      }
    }
    else  {
      codigo = await gerarCodigoUnico(from);
    }
// Se a imagem veio de uma mensagem citada (foto solta + reply com o comando),
// monta um "mensagem falsa" só com o necessário pra baixar a mídia dela.
    let mensagemParaBaixar = message;
    if (!temImagem && imagemCitada)  {
      const contextInfo = message.message.extendedTextMessage.contextInfo;
      mensagemParaBaixar =  {
        key:  {
          remoteJid: from, id: contextInfo.stanzaId, fromMe: false, participant: contextInfo.participant
        }
        , message: quotedMessage
      }
      ;
    }
// Baixa a imagem (fica salva localmente por registro)
    const buffer = await downloadMediaMessage(mensagemParaBaixar, 'buffer',  {
    }
    );
    const fotoPath = path.join(PASTA_LEILOES, `${message.key.id}.jpg`);
    fs.writeFileSync(fotoPath, buffer);
// Cria o registro ANTES de enviar a foto, assim já sabemos o ID e o código
// pra colocar na legenda do próprio anúncio.
    const insertResult = await pool.query( `INSERT INTO damas_dc_leiloes
                (grupo_id, admin_id, foto_message_id, foto_path, valor_inicial, valor_atual, status, codigo)
             VALUES ($1, $2, $3, $4, $5, $5, 'aberto', $6)
             RETURNING id`, [from, adminId, message.key.id, fotoPath, valorInicial, codigo] );
    const leilaoId = insertResult.rows[0].id;
// Leilão abre AGORA. Esta mensagem será usada como "quote"
// nas confirmações e recusas de lance.
    const anuncio = await sock.sendMessage(from,  {
      image: buffer, caption: `👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\n` + `🔨 *LEILÃO [${codigo}] ABERTO!* 🔨\n\n` + `💰 *Lance inicial:* ${valorInicial.toLocaleString('pt-BR')} DC\n\n` + `🔥 *QUER PARTICIPAR?*\n` + `É só mandar seu lance usando uma das opções abaixo:\n\n` + `💸 *Opção 1:*\n` + `#lance <valor>dc cod${codigo}\n\n` + `💬 *Opção 2:*\n` + `Responda *ESTA MENSAGEM* com:\n` + `#lance <valor>dc\n\n` + `⚠️ *ATENÇÃO:* Só serão considerados os lances enviados corretamente.\n\n` + `🏆 Quem der o maior lance até o encerramento leva o arremate!\n\n` + `😈 Preparem os DC... porque a resenha vai começar!\n\n` + `🛑 *ENCERRAMENTO:* Um admin encerra o leilão respondendo *ESTA MENSAGEM* com:\n` + `*#fl*\n\n` + `🍻 *Boa sorte aos participantes!* 🔥💃`
    }
    );
    const anuncioMessageId = anuncio.key.id;
    await pool.query( `UPDATE damas_dc_leiloes SET anuncio_message_id = $1 WHERE id = $2`, [anuncioMessageId, leilaoId] );
// Guarda o objeto completo da mensagem (com a foto) pra poder ser usado
// como "quoted" em qualquer resposta de lance futura deste leilão.
    anunciosCache.set(leilaoId, anuncio);
// Registra a foto como alvo válido de reply
    await pool.query( `INSERT INTO damas_dc_leiloes_mensagens (message_id, leilao_id) VALUES ($1, $2)
             ON CONFLICT (message_id) DO NOTHING`, [anuncioMessageId, leilaoId] );
    const confirmacaoCriacao = await sock.sendMessage(from,  {
      text: `✅ Leilão *[${codigo}]* (#${leilaoId}) criado e aberto para lances.`
    }
    ,  {
      quoted: message
    }
    );
// A confirmação de "criado com sucesso" também vira alvo válido de reply —
// é comum o admin ou algum membro responder ela em vez de responder a foto.
    await pool.query( `INSERT INTO damas_dc_leiloes_mensagens (message_id, leilao_id) VALUES ($1, $2)
             ON CONFLICT (message_id) DO NOTHING`, [confirmacaoCriacao.key.id, leilaoId] );
    return true;
  }
  catch (err)  {
    console.error('[handleLeilaoCommand] Erro:', err.message);
    await sock.sendMessage(from,  {
      text: '❌ Erro ao criar o leilão.'
    }
    ,  {
      quoted: message
    }
    );
    return true;
  }
}