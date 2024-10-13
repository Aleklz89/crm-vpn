import { Bot, webhookCallback, Context } from 'grammy';
import { PrismaClient, ArbitrationStatus } from '@prisma/client';


const token = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_SUPPORT_BOT_TOKEN not found.');

const bot = new Bot(token);
const prisma = new PrismaClient();

interface MessageData {
  chat_id: string;
  text: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
  };
}

// Функция отправки сообщений пользователю
async function sendTelegramMessageToUser(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_USER_BOT_TOKEN;
  if (!botToken) {
    console.error('Ошибка: TELEGRAM_USER_BOT_TOKEN не установлен');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!response.ok) {
      throw new Error(`Ошибка отправки сообщения: ${response.statusText}`);
    }

    console.log(`Сообщение успешно отправлено пользователю с ID: ${chatId}`);
  } catch (error) {
    console.error('Ошибка при отправке сообщения пользователю:', error);
  }
}

async function sendTelegramMessageToModerator(chatId: string, text: string, arbitrationId?: bigint) {
  const botToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!botToken) {
    console.error('Ошибка: TELEGRAM_ADMIN_BOT_TOKEN не установлен');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const messageData: MessageData = {
      chat_id: chatId,
      text,
    };

    // Если передан arbitrationId, добавляем кнопку "Рассмотреть"
    if (arbitrationId) {
      messageData.reply_markup = {
        inline_keyboard: [
          [
            {
              text: 'Рассмотреть',
              callback_data: `review_${arbitrationId.toString()}`,
            },
          ],
        ],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error(`Ошибка отправки сообщения модератору: ${response.statusText}`);
    }

    console.log(`Сообщение успешно отправлено модератору с ID: ${chatId}`);
  } catch (error) {
    console.error('Ошибка при отправке сообщения модератору:', error);
  }
}




type TranslationKey = keyof typeof translations["en"];

const getTranslation = (lang: "en" | "ru", key: TranslationKey) => {
  return translations[lang][key] || translations["en"][key];
};

const translations = {
  en: {
    end_dialog_error: "Error: could not get your Telegram ID.",
    no_active_requests: "⚠️ You have no active requests.",
    dialog_closed: "The dialog with the user has been closed.",
    assistant_finished_dialog: "The assistant has finished the dialog.",
    start_invalid_link: "❌ The link is invalid or has already been used.",
    assistant_congrats: "🎉 Congratulations, you are now an assistant!",
    start_message: "👋 This is the support bot! Use a valid invite link to access the functionality.",
    menu_message: "📋 Main menu:",
    start_work: "🚀 Start working!",
    my_coins: "💰 My coins",
    my_activity: "📊 My activity",
    already_working: "⚠️ You are already working!",
    work_started: "🚀 Work started! To end, use the /end_work command.",
    end_work: "🚪 Work finished!",
    no_working_status: "⚠️ You are not working at the moment!",
    accept_request: "✅ You have accepted the request. Please wait for the user's question.",
    reject_request: "❌ You have rejected the request.",
    send_message_error: "Please send a text message.",
    no_user_requests: "⚠️ You have no active user requests.",
    error_processing_message: "An error occurred while processing your message. Please try again later.",
  },
  ru: {
    end_dialog_error: "Ошибка: не удалось получить ваш идентификатор Telegram.",
    no_active_requests: "⚠️ У вас нет активных запросов.",
    dialog_closed: "Диалог с пользователем завершен.",
    assistant_finished_dialog: "Ассистент завершил диалог.",
    start_invalid_link: "❌ Ссылка недействительна или уже была использована.",
    assistant_congrats: "🎉 Поздравляем, вы стали ассистентом!",
    start_message: "👋 Это бот для саппортов! Используйте действительную пригласительную ссылку для доступа к функционалу.",
    menu_message: "📋 Главное меню:",
    start_work: "🚀 Начать работу!",
    my_coins: "💰 Мои коины",
    my_activity: "📊 Моя активность",
    already_working: "⚠️ Вы уже работаете!",
    work_started: "🚀 Работа начата! Чтобы завершить работу, используйте команду /end_work.",
    end_work: "🚪 Работа завершена!",
    no_working_status: "⚠️ Вы не работаете в данный момент!",
    accept_request: "✅ Вы приняли запрос. Ожидайте вопрос пользователя.",
    reject_request: "❌ Вы отклонили запрос.",
    send_message_error: "Пожалуйста, отправьте текстовое сообщение.",
    no_user_requests: "⚠️ У вас нет активных запросов пользователей.",
    error_processing_message: "Произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте еще раз позже.",
  },
};

const detectUserLanguage = (ctx: Context) => {
  const userLang = ctx.from?.language_code;
  return userLang === 'ru' ? 'ru' : 'en';
};

async function endActiveDialog(telegramId: bigint, lang: "en" | "ru", ctx: Context) {
  try {
    // Ищем активный запрос, связанный с ассистентом
    const activeRequest = await prisma.assistantRequest.findFirst({
      where: {
        assistant: { telegramId: telegramId }, // telegramId ассистента
        isActive: true,
      },
      include: { user: true },
    });

    if (!activeRequest) {
      await ctx.reply(getTranslation(lang, 'no_active_requests'));
      return;
    }

    // Обновляем статус запроса как завершённый
    await prisma.assistantRequest.update({
      where: { id: activeRequest.id },
      data: { status: 'COMPLETED', isActive: false },
    });

    // Обновляем статус ассистента
    await prisma.assistant.update({
      where: { telegramId: telegramId }, // telegramId ассистента
      data: { isBusy: false },
    });

    await ctx.reply(getTranslation(lang, 'dialog_closed'));

    // Отправляем сообщение пользователю
    await sendTelegramMessageToUser(activeRequest.user.telegramId.toString(), getTranslation(lang, 'assistant_finished_dialog'));
  } catch (error) {
    console.error('Ошибка при завершении диалога:', error);
    await ctx.reply(getTranslation(lang, 'end_dialog_error'));
  }
}

// Команда end_dialog
bot.command('end_dialog', async (ctx) => {
  const lang = detectUserLanguage(ctx);

  try {
    if (!ctx.from?.id) {
      await ctx.reply(getTranslation(lang, 'end_dialog_error'));
      return;
    }

    const telegramId = BigInt(ctx.from.id);
    await endActiveDialog(telegramId, lang, ctx);
  } catch (error) {
    console.error('Error ending dialog:', error);
    await ctx.reply(getTranslation(lang, 'end_dialog_error'));
  }
});

// Команда end_work
bot.command('end_work', async (ctx) => {
  try {
    if (!ctx.from?.id) {
      await ctx.reply(getTranslation(detectUserLanguage(ctx), 'end_dialog_error'));
      return;
    }

    const telegramId = BigInt(ctx.from.id);
    const lang = detectUserLanguage(ctx);

    // Завершаем активный диалог, если есть
    await endActiveDialog(telegramId, lang, ctx);

    // Проверяем, работает ли ассистент
    const assistant = await prisma.assistant.findUnique({
      where: { telegramId: telegramId },
    });
    if (!assistant?.isWorking) {
      await ctx.reply(getTranslation(lang, 'no_working_status'));
      return;
    }

    // Обновляем статус работы ассистента
    await prisma.assistant.update({
      where: { telegramId: telegramId },
      data: { isWorking: false, isBusy: false },
    });

    await ctx.reply(getTranslation(lang, 'end_work'));
  } catch (error) {
    console.error('Ошибка при завершении работы:', error);
    await ctx.reply(getTranslation(detectUserLanguage(ctx), 'end_dialog_error'));
  }
});

bot.command('start', async (ctx) => {
  const lang = detectUserLanguage(ctx);
  const args = ctx.match?.split(' ') ?? [];

  if (args.length > 0 && args[0].startsWith('invite_')) {
    const inviteToken = args[0].replace('invite_', '');

    try {
      const invitation = await prisma.invitation.findUnique({ where: { token: inviteToken } });

      if (!invitation || invitation.used) {
        await ctx.reply(getTranslation(lang, 'start_invalid_link'));
        return;
      }

      if (ctx.from?.id) {
        const telegramId = BigInt(ctx.from.id);

        await prisma.assistant.create({
          data: {
            telegramId: telegramId,
            role: invitation.role,
          },
        });

        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { used: true },
        });

        await ctx.reply(getTranslation(lang, 'assistant_congrats'));

        // Обновляем последнее активное время ассистента
        await prisma.assistant.update({
          where: { telegramId: telegramId },
          data: { lastActiveAt: new Date() },
        });
      } else {
        await ctx.reply(getTranslation(lang, 'end_dialog_error'));
      }
    } catch (error) {
      console.error('Error assigning assistant role:', error);
      await ctx.reply(getTranslation(lang, 'end_dialog_error'));
    }
  } else {
    await ctx.reply(getTranslation(lang, 'start_message'));
  }
});

bot.command('menu', async (ctx) => {
  const lang = detectUserLanguage(ctx);

  try {
    // Проверяем, что ctx.from существует
    if (!ctx.from?.id) {
      await ctx.reply(getTranslation(lang, 'end_dialog_error'));
      return;
    }

    const telegramId = BigInt(ctx.from.id);

    // Проверяем, является ли пользователь ассистентом
    const assistant = await prisma.assistant.findUnique({
      where: { telegramId: telegramId },
    });

    if (!assistant) {
      await ctx.reply(getTranslation(lang, 'end_dialog_error'));
      return;
    }

    // Обновляем последнее активное время ассистента
    await prisma.assistant.update({
      where: { telegramId: telegramId },
      data: { lastActiveAt: new Date() },
    });

    // Отображаем меню, если пользователь ассистент
    await ctx.reply(getTranslation(lang, 'menu_message'), {
      reply_markup: {
        inline_keyboard: [
          [{ text: getTranslation(lang, 'start_work'), callback_data: 'start_work' }],
          [{ text: getTranslation(lang, 'my_coins'), callback_data: 'my_coins' }],
          [{ text: getTranslation(lang, 'my_activity'), callback_data: 'my_activity' }],
        ],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Error showing menu:', errorMessage);
  }
});

bot.on('callback_query:data', async (ctx) => {
  const lang = detectUserLanguage(ctx);

  if (ctx.from?.id) {
    const telegramId = BigInt(ctx.from.id);
    const data = ctx.callbackQuery?.data;

    if (data.startsWith('accept_') || data.startsWith('reject_')) {
      const [action, requestId] = data.split('_');

      if (action === 'accept') {
        await handleAcceptRequest(requestId, telegramId, ctx);
      } else if (action === 'reject') {
        await handleRejectRequest(requestId, telegramId, ctx);
      }

      // Завершаем обработку здесь, чтобы "📊 Моя активность" не отправлялась
      return;
    }

    if (data === 'start_work') {
      const assistant = await prisma.assistant.findUnique({ where: { telegramId: telegramId } });

      if (assistant?.isWorking) {
        await ctx.reply(getTranslation(lang, 'already_working'));
        return;
      }

      await prisma.assistant.update({
        where: { telegramId: telegramId },
        data: { isWorking: true, isBusy: false },
      });

      await ctx.reply(getTranslation(lang, 'work_started'));
      return;
    } else if (data === 'my_coins') {
      // Добавляем получение количества коинов ассистента
      const assistant = await prisma.assistant.findUnique({
        where: { telegramId: telegramId },
      });

      if (assistant) {
        const coinsMessage = `${getTranslation(lang, 'my_coins')}: ${assistant.coins}`; // Выводим количество коинов
        await ctx.reply(coinsMessage);
      } else {
        await ctx.reply(getTranslation(lang, 'end_dialog_error'));
      }
    } else if (data === 'my_activity') {
      await ctx.reply('📊 Моя активность: 10 завершенных задач.');
    }
  } else {
    await ctx.reply(getTranslation(lang, 'end_dialog_error'));
  }
});


// Функции для обработки принятия и отклонения запросов
async function handleAcceptRequest(requestId: string, assistantTelegramId: bigint, ctx: Context) {
  try {
    const assistantRequest = await prisma.assistantRequest.update({
      where: { id: BigInt(requestId) },
      data: { status: 'IN_PROGRESS', isActive: true },
      include: { user: true },
    });

    await prisma.assistant.update({
      where: { telegramId: assistantTelegramId },
      data: { isBusy: true },
    });

    await ctx.reply('✅ Вы приняли запрос. Ожидайте вопрос пользователя.');

    await sendTelegramMessageToUser(
      assistantRequest.user.telegramId.toString(),
      'Ассистент присоединился к чату. Сформулируйте свой вопрос.'
    );
  } catch (error) {
    console.error('Ошибка при принятии запроса:', error);
    await ctx.reply('❌ Произошла ошибка при принятии запроса.');
  }
}

async function handleRejectRequest(requestId: string, assistantTelegramId: bigint, ctx: Context) {
  try {
    // Обновляем статус запроса как "Отклонено" и деактивируем его
    await prisma.assistantRequest.update({
      where: { id: BigInt(requestId) },
      data: { status: 'REJECTED', isActive: false },
    });

    // Обновляем статус ассистента, что он не занят
    await prisma.assistant.update({
      where: { telegramId: assistantTelegramId },
      data: { isBusy: false },
    });

    // Отправляем сообщение ассистенту
    await ctx.reply('❌ Вы отклонили запрос.');
  } catch (error) {
    console.error('Ошибка при отклонении запроса:', error);
    await ctx.reply('❌ Произошла ошибка при отклонении запроса.');
  }
}

// Обработчик команды /problem
bot.command('problem', async (ctx) => {
  try {
    if (!ctx.from?.id) {
      await ctx.reply('Ошибка: не удалось получить ваш идентификатор Telegram.');
      return;
    }

    const telegramId = BigInt(ctx.from.id);
    const assistant = await prisma.assistant.findUnique({
      where: { telegramId: telegramId },
    });

    if (!assistant) {
      await ctx.reply('Ошибка: ассистент не найден.');
      return;
    }

    const activeRequest = await prisma.assistantRequest.findFirst({
      where: {
        assistant: { telegramId: telegramId },
        isActive: true,
      },
      include: { user: true },
    });

    if (!activeRequest) {
      await ctx.reply('⚠️ У вас нет активных запросов.');
      return;
    }

    // Проверяем, нет ли уже активного арбитража
    const existingArbitration = await prisma.arbitration.findFirst({
      where: {
        assistantId: telegramId,
        userId: activeRequest.userId,
        status: 'IN_PROGRESS' as ArbitrationStatus,
      },
    });

    if (existingArbitration) {
      await ctx.reply('У вас уже есть активный арбитраж по этому запросу.');
      return;
    }

    // Получаем никнеймы пользователя и ассистента
    const userNickname = activeRequest.user.username || null;
    const assistantNickname = ctx.from.username || null;

    // Создаём новый арбитраж с сохранением никнеймов
    const arbitration = await prisma.arbitration.create({
      data: {
        userId: activeRequest.userId,
        userNickname, // Сохраняем никнейм пользователя
        assistantId: telegramId,
        assistantNickname, // Сохраняем никнейм ассистента
        moderatorId: null,
        reason: 'Открытие арбитража ассистентом',
        status: 'PENDING' as ArbitrationStatus,
      },
    });

    await ctx.reply('Для решения спорной ситуации приглашен модератор.');
    await sendTelegramMessageToUser(
      activeRequest.user.telegramId.toString(),
      'Для решения спорной ситуации приглашен модератор.'
    );

    // Ищем модератора с последней активностью
    const lastActiveModerator = await prisma.moderator.findFirst({
      orderBy: {
        lastActiveAt: 'desc', // Сортируем по последней активности
      },
    });

    if (!lastActiveModerator) {
      await ctx.reply('Нет активных модераторов.');
      return;
    }

    // Отправляем сообщение последнему активному модератору через бота для модераторов
    await sendTelegramMessageToModerator(
      lastActiveModerator.id.toString(), // Используем telegramId модератора
      'Для решения спорной ситуации приглашен модератор. Проверьте арбитраж.',
      arbitration.id // Передаем ID арбитража
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    await ctx.reply(`⚠️ Произошла ошибка при открытии арбитража: ${errorMessage}. Пожалуйста, попробуйте еще раз.`);
  }
});



// Обработчик входящих сообщений от ассистента
bot.on('message', async (ctx) => {
  try {
    const lang = detectUserLanguage(ctx);

    if (!ctx.from?.id) {
      await ctx.reply(getTranslation(lang, 'end_dialog_error'));
      return;
    }

    const assistantTelegramId = BigInt(ctx.from.id);
    const assistantMessage = ctx.message?.text;

    if (!assistantMessage) {
      await ctx.reply(getTranslation(lang, 'send_message_error'));
      return;
    }

    // Одновременный поиск активного запроса и активного арбитража
    const [activeRequest, arbitration] = await Promise.all([
      prisma.assistantRequest.findFirst({
        where: {
          assistant: { telegramId: assistantTelegramId },
          isActive: true,
        },
        include: { user: true },
      }),
      prisma.arbitration.findFirst({
        where: {
          assistantId: assistantTelegramId,
          status: 'IN_PROGRESS' as ArbitrationStatus,
        },
        include: {
          user: true,
          moderator: true,
        },
      }),
    ]);

    if (arbitration) {
      // Если есть активный арбитраж, пересылаем сообщение пользователю и модератору
      const messageToSend = `Ассистент:\n${assistantMessage}`;

      // Отправляем сообщение пользователю
      await sendTelegramMessageToUser(
        arbitration.user.telegramId.toString(),
        messageToSend
      );

      // Отправляем сообщение модератору, если он назначен
      if (arbitration.moderator) {
        await sendTelegramMessageToModerator(
          arbitration.moderator.id.toString(),
          messageToSend
        );
      }
    } else if (activeRequest) {
      // Если есть активный запрос, пересылаем сообщение пользователю
      await sendTelegramMessageToUser(
        activeRequest.user.telegramId.toString(),
        assistantMessage
      );
    } else {
      // Нет активных запросов или арбитражей
      await ctx.reply(getTranslation(lang, 'no_user_requests'));
    }
  } catch (error) {
    console.error('Ошибка при обработке сообщения от ассистента:', error);
    await ctx.reply(getTranslation(detectUserLanguage(ctx), 'error_processing_message'));
  }
});

export const POST = webhookCallback(bot, 'std/http');
