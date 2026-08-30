import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSimpleSticker } from '../features/stickerHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STICKERS_DIR = path.resolve(process.cwd(), 'bot/stickers');

const STICKER_MAP = [
  // CARINHO
  {
    file: 'carinho.jpg',
    tags: [
      'vc é meu bb', 'meu bb', 'bb', 'amor', 'te amo', 'saudade', 'fofo', 'mozao', 'mozi',
      'melzinho', 'xodó', 'dengo', 'xuxu', 'meu tudo', 'meu coração', 'vida minha',
      'amo muito', 'amo demais', 'te adoro', 'meu bem', 'meu anjo', 'anjo', 'benzinho',
      'docinho', 'fofinho', 'fofura', 'minha vida', 'minha luz', 'luz da minha vida',
      'você é tudo', 'vc é tudo', 'sinto sua falta', 'com saudade', 'tô com saudade',
      'meu sol', 'meu bebê', 'bebê', 'meu amor', 'amorzão', 'amorzinho', 'mei amor',
      'te quero', 'quero você', 'gosto muito de você', 'apaixonada', 'apaixonado',
    ]
  },
  {
    file: 'carinho2.jpg',
    tags: [
      'você me ama', 'me ama', 'amei', 'coração', 'lindeza', 'carinho', 'pão de mel',
      'bombom', 'pudim', 'baby', 'gostosa', 'gostoso', 'lindo', 'linda', 'lindo demais',
      'que lindo', 'que linda', 'crush', 'paixão', 'tô apaixonado', 'tô apaixonada',
      'meu crush', 'suspiro', 'ai que fofo', 'amoroso', 'amorosa', 'meigo', 'meiga',
      'docura', 'doçura', 'meu doce', 'açúcar', 'mel', 'você é doce', 'vc é doce',
      'que delícia', 'delícia', 'perfeito', 'perfeita', 'te amo mt', 'amo mt vc',
      'coraçãozinho', '❤️', '🥰', '😍', '💕', '💗', '💓',
    ]
  },
  {
    file: 'carinho3.jpg',
    tags: [
      'obrigada', 'obrigado', 'valeu', 'gratidão', 'grata', 'grato', 'que fofo', 'que amor',
      'brigada', 'brigado', 'muito obrigada', 'muito obrigado', 'vlw',
      'obg', 'obrigadão', 'thanks', 'thank you', 'obrigadinha', 'que gentileza',
      'que atencioso', 'que atenciosa', 'agradecida', 'agradecido', 'agradeço',
      'fico feliz', 'me fez feliz', 'alegria', 'alegrou meu dia', 'fez meu dia',
      'que surpresa boa', 'que coisa boa', 'adorei', 'amei muito', 'adorei muito',
    ]
  },

  // RISADA
  {
    file: 'risada1.jpg',
    tags: [
      'kk', 'kkk', 'haha', 'rsrs', 'lol', 'engraçado', 'morri', 'kkkk', 'kkkkk',
      'hahaha', 'hahah', 'rsrsrs', 'huahua', 'hauhauhau', 'uahsuahs', 'hshs',
      'hsuahsua', 'kkkkkk', 'kkkkkkk', 'ri muito', 'tô rindo', 'to rindo',
      'que engraçado', 'engraçadíssimo', 'fui', 'dei risada', 'risada',
      'que cena', 'que situação cômica', 'palhaçada', 'zuera', 'zoeira',
      'piada', 'me matou', 'kkkkk morri', 'tô morta', 'tô morto', 'sksksk',
    ]
  },
  {
    file: 'risada2.jpg',
    tags: [
      'morrendo', 'chorei', 'muito engraçado', 'hahaha', 'chorei de rir',
      'lágrima', 'lágrimas', 'caindo no chão', 'no chão', 'rolando no chão',
      'me rolei', 'que coisa mais engraçada', 'não aguento', 'nao aguento',
      'não tô aguentando', 'morrendo de rir', 'morri de rir', 'quase morri',
      'que morte', 'demais', 'sério não', 'isso não', 'ai meu deus',
      '😂', '🤣', 'chorando de rir', 'gargalhada', 'gargalhei', 'caí da cadeira',
      'fui embora', 'acabei', 'me acabei', 'não sobrevivi',
    ]
  },
  {
    file: 'risada3.jpg',
    tags: [
      'coisa', 'que coisa', 'meu deus', 'que situação', 'senhor', 'nossa',
      'nossa senhora', 'gente', 'pelo amor', 'pelo amor de deus', 'socorro',
      'que absurdo', 'absurdo', 'não acredito', 'nao acredito', 'tá de brincadeira',
      'ta de brincadeira', 'sério', 'serio', 'hein', 'como assim', 'o quê',
      'o que', 'que isso', 'gente veja', 'vixe', 'vixi', 'uai', 'eita',
      'eita porra', 'oxe', 'que negócio', 'que negocio', 'minha gente',
      'que história', 'que historia', 'impressionante', 'inacreditável',
    ]
  },
  {
    file: 'risada4.jpg',
    tags: [
      'lindeza', 'que lindeza', 'kkk linda', 'graça',
      'que graça', 'gracinha', 'graciosidade', 'que charme', 'charme',
      'que estilo', 'estilosa', 'estiloso', 'elegante', 'elegância',
      'maravilhosa', 'maravilhoso', 'maravilha', 'incrível', 'incrivel',
      'sensacional', 'fantástico', 'fantastico', 'arrasando', 'arrasou',
      'que arraso', 'poderosa', 'poderoso', 'rainha', 'rei', 'diva',
      'que diva', 'deus', 'meu deus que perfeição', 'top', 'top demais',
      'muito bom', 'que bom', 'adorei', 'perfeição', 'perfeicao',
    ]
  },

  // CONCORDA
  {
    file: 'concorda.jpg',
    tags: [
      'concordo', 'concorda', 'exatamente', 'exato', 'isso mesmo', 'é isso',
      'verdade', 'é verdade', 'com certeza', 'com toda certeza', 'certeza',
      'com certeza absoluta', 'com toda a razão', 'razão', 'tem razão',
      'você tem razão', 'vc tem razão', 'sim', 'com certeza sim', 'é claro',
      'óbvio', 'obvio', 'sem dúvida', 'sem duvida', 'faz sentido', 'exato isso',
      'confere', 'bate', 'é por aí', 'é por ai', 'fechou', 'combinado',
      'apoiado', 'apoiadíssimo', 'pode crer', 'com toda', '👍', '✅', '💯',
      '🙌', '👌', '🤝', '😌', '🫡',
    ]
  },

  // DEBOCHE
  {
    file: 'deboche1.jpg',
    tags: [
      'sei', 'sei sei', 'sei lá', 'tá bom', 'ta bom', 'aham', 'aham sei',
      'duvido', 'tá certo', 'ta certo', 'aham tá', 'sei sim', 'sei não',
      'tá jurando', 'ta jurando', 'jura', 'sério mesmo', 'sei viu',
      '🙄', '😏', '🤨',
    ]
  },
  {
    file: 'deboche2.jpg',
    tags: [
      'fala sério', 'para com isso', 'para com isso kkk', 'olha só', 'ah tá',
      'ah ta', 'imagina', 'imagina só', 'vai com fé', 'vai que cola',
      'conta outra', 'me convence', 'não me convence', 'nao me convence',
      '😂🙄', '😒', '🤦',
    ]
  },
  {
    file: 'deboche3.jpg',
    tags: [
      'mentira', 'mentiroso', 'mentirosa', 'não acredito em você', 'nao acredito em você',
      'para de mentir', 'tá mentindo', 'ta mentindo', 'mentindo', 'inventando',
      'história forte', 'historia forte', 'sei que tá mentindo',
      '😤', '🙅', '🙅‍♀️',
    ]
  },
  {
    file: 'deboche4.jpg',
    tags: [
      'convencido', 'convencida', 'metido', 'metida', 'se acha', 'se achando',
      'ego', 'egocêntrico', 'egocentrica', 'cheio de si', 'cheia de si',
      'pose', 'com pose', 'só falta', 'humildade zero',
      '😎', '💅', '🫠',
    ]
  },
  {
    file: 'deboche5.jpg',
    tags: [
      'chato', 'chata', 'irritante', 'enche o saco', 'enchendo o saco',
      'cansativo', 'cansativa', 'insuportável', 'insuportavel', 'sem noção',
      'sem nocao', 'folgado', 'folgada',
      '😑', '🫤', '😐',
    ]
  },
  {
    file: 'deboche6.jpg',
    tags: [
      'não to nem aí', 'nao to nem ai', 'sei lá viu', 'que seja', 'tanto faz',
      'nem ligo', 'não ligo', 'nao ligo', 'foda-se', 'liga não', 'liga nao',
      'pouco importa', 'zero interesse',
      '🤷', '🤷‍♀️', '😮‍💨',
    ]
  },
  {
    file: 'deboche7.jpg',
    tags: [
      'te peguei', 'peguei você', 'flagrei', 'flagra', 'olha o que achei',
      'era você', 'sabia', 'eu sabia', 'suspeitava', 'agora entendi tudo',
      'saca só', 'olha só quem', 'engana', 'enganando', 'me engana',
      '👀', '😈', '🕵️', '🕵️‍♀️',
    ]
  },

  // PENSANDO
  {
    file: 'pensando.jpg',
    tags: [
      'pensando', 'deixa eu pensar', 'não sei', 'nao sei', 'sei lá',
      'sei la', 'hmm', 'hummm', 'humm', 'talvez', 'quem sabe',
      'boa pergunta', 'vou pensar', 'deixa eu ver', 'não faço ideia',
      'nao faço ideia', 'complicado', 'difícil dizer', 'dificil dizer',
      '🤔', '🧐', '💭', '🤷‍♀️', '🤷‍♂️',
    ]
  },

  // SURPRESA
  {
    file: 'surpresa.jpg',
    tags: [
      'chocada', 'chocado', 'que susto', 'susto', 'não esperava', 'nao esperava',
      'não acredito nisso', 'nao acredito nisso', 'sério isso', 'serio isso',
      'meu deus do céu', 'meu deus do ceu', 'espantada', 'espantado',
      'surpresa', 'me surpreendeu', 'nossa mesmo', 'não sabia disso',
      'nao sabia disso',
      '😱', '😨', '😧', '🫢',
    ]
  },
  {
    file: 'surpresa2.jpg',
    tags: [
      'vixe', 'viixe', 'oxente', 'nossa senhora', 'credo', 'eita porra',
      'eita', 'que isso', 'para tudo', 'para tudo agora', 'pera aí',
      'pera ai', 'quê isso', 'que loucura', 'olha isso', 'olha só isso',
      '😳', '🫣', '😮',
    ]
  },
];

// ============================================
// 🎯 ESCOLHE STICKER PELO CONTEXTO DO TEXTO
// ============================================
function escolherSticker(texto) {
  if (!texto) return null;
  const lower = texto.toLowerCase();

  let melhor = null;
  let maiorScore = 0;

  for (const sticker of STICKER_MAP) {
    const filePath = path.join(STICKERS_DIR, sticker.file);
    if (!fs.existsSync(filePath)) continue;

    let score = 0;
    for (const tag of sticker.tags) {
      if (lower.includes(tag)) score++;
    }

    if (score > maiorScore) {
      maiorScore = score;
      melhor = sticker.file;
    }
  }

  // ✅ Sem match = sem sticker, sem aleatório
  if (maiorScore === 0) return null;

  return path.join(STICKERS_DIR, melhor);
}

// ============================================
// 📤 ENVIA STICKER PELO BAILEYS
// ============================================
export async function enviarMayaSticker(sock, remoteJid, textoContexto, message = null) {
  try {
    const stickerPath = escolherSticker(textoContexto);
    if (!stickerPath) {
      console.log('🎭 [Maya Sticker] Nenhum sticker disponível ou aplicável.');
      return false;
    }

    console.log(`🎭 [Maya Sticker] Enviando: ${path.basename(stickerPath)}`);

    const imageBuffer = fs.readFileSync(stickerPath);
    const stickerBuffer = await createSimpleSticker(imageBuffer);

    if (!stickerBuffer) {
      console.warn('⚠️ [Maya Sticker] Falha ao converter imagem.');
      return false;
    }

    // ✅ Marca o usuário com quoted
    await sock.sendMessage(
      remoteJid,
      { sticker: stickerBuffer, mimetype: 'image/webp' },
      message ? { quoted: message } : {}
    );

    console.log('✅ [Maya Sticker] Sticker enviado com sucesso!');
    return true;

  } catch (err) {
    console.error('❌ [Maya Sticker] Erro ao enviar sticker:', err.message);
    return false;
  }
}