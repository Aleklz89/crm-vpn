import { Bot, webhookCallback } from 'grammy';
import { PrismaClient } from '@prisma/client';

const token = process.env.TELEGRAM_USER_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_USER_BOT_TOKEN not found.');

const bot = new Bot(token);


const prisma = new PrismaClient();

bot.command('start', async (ctx) => {
  await ctx.reply('👋 Это бот для пользователей! Для продолжения нажмите на кнопку ниже и войдите в Telegram Web App.', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚪 Войти в Web App',
            web_app: { url: 'https://crm-vpn.vercel.app/user-profile' },
          },
        ],
      ],
    },
  });
});


bot.command('end_ai', async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();

    if (!telegramId) {
      await ctx.reply('Не удалось получить ваш идентификатор пользователя.');
      return;
    }

  
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      
      await ctx.reply('Пользователь не найден. Пожалуйста, воспользуйтесь командой /start, чтобы начать.');
      return;
    }

    if (!user.isActiveAIChat) {
   
      await ctx.reply('Вы не находитесь в активном диалоге с ИИ.');
    } else {
   
      await prisma.user.update({
        where: { telegramId },
        data: { isActiveAIChat: false },
      });

    
      await ctx.reply('Диалог с ИИ завершен. Спасибо за использование нашего сервиса!');

  
    }
  } catch (error) {
    console.error('Ошибка при обработке команды /end_ai:', error);
    await ctx.reply('Произошла ошибка при завершении диалога с ИИ. Пожалуйста, попробуйте еще раз позже.');
  } finally {
  
  }
});

export const POST = webhookCallback(bot, 'std/http');
