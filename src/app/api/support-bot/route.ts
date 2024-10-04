import { Bot, webhookCallback } from 'grammy';
import { PrismaClient } from '@prisma/client';

const token = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN not found.');

const bot = new Bot(token);
const prisma = new PrismaClient();

bot.command('start', async (ctx) => {

  const args = ctx.match?.split(' ') ?? [];
  if (args.length > 0 && args[0].startsWith('invite_')) {
    const inviteToken = args[0].replace('invite_', '');

    try {
     
      const invitation = await prisma.invitation.findUnique({
        where: { token: inviteToken },
      });

      if (!invitation || invitation.used) {
        await ctx.reply('Ссылка недействительна или уже была использована.');
        return;
      }

   
      await prisma.assistant.create({
        data: {
          telegramId: String(ctx.from?.id),
          role: invitation.role,
        },
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { used: true },
      });

      await ctx.reply('Поздравляем, вы стали ассистентом и получили доступ к функционалу бота!');
    } catch (error) {
      console.error('Ошибка при назначении роли ассистента:', error);
      await ctx.reply('Произошла ошибка при обработке вашей заявки. Пожалуйста, попробуйте позже.');
    }
  } else {

    await ctx.reply('👋 Это бот для саппортов! Используйте действительную пригласительную ссылку для доступа к функционалу.');
  }
});

export const POST = webhookCallback(bot, 'std/http');
