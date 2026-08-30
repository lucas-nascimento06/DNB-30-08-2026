// ARQUIVO: bot/codigos/handlers/command/leilaoCache.js
//
// Cache em memória: leilaoId -> mensagem de anúncio (key + message, retorno do sock.sendMessage)
// Usado pra permitir que TODAS as respostas de lance (confirmação e recusas) sejam
// enviadas como "quote" da foto do anúncio original, dando contexto visual imediato
// de qual item está sendo leiloado.
//
// Importante: isso é só em memória. Se o bot reiniciar, o cache zera e as respostas
// caem no fallback (sem quote da foto, mas o código do leilão continua aparecendo
// no texto, então a ambiguidade nunca volta).

export const anunciosCache = new Map();