import { PrismaClient } from '@prisma/client'; 
import { nanoid } from 'nanoid'; // Для генерации уникальных токенов
import bcrypt from 'bcryptjs'; // Подключаем bcryptjs

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { login, password } = body;

    if (!login || !password) {
      return new Response(JSON.stringify({ message: 'Логин и пароль обязательны' }), {
        status: 400,
      });
    }

    // Проверяем, не занят ли уже логин
    const existingInvitation = await prisma.invitation.findFirst({
      where: { login }, // Используем findFirst для поиска по login
    });

    if (existingInvitation) {
      return new Response(JSON.stringify({ message: 'Логин уже используется' }), {
        status: 400,
      });
    }

    // Хешируем пароль перед сохранением
    const hashedPassword = bcrypt.hashSync(password, 10); // Хешируем с использованием "соли" 10

    // Генерируем уникальный inviteToken
    const inviteToken = nanoid(10);

    // Сохраняем данные в таблице приглашений с логином, хешированным паролем и токеном приглашения
    await prisma.invitation.create({
      data: {
        login,       // Логин для модератора
        password: hashedPassword,    // Хешированный пароль для модератора
        token: inviteToken,  // Уникальный токен приглашения
        role: 'moderator',   // Роль явно задаём как "moderator"
        link: `https://t.me/vpn_srm_adminbot?start=invite_${inviteToken}`,  // Ссылка для приглашения
      },
    });

    // Генерируем ссылку на бота для модераторов
    const inviteLink = `https://t.me/vpn_srm_adminbot?start=invite_${inviteToken}`; // Используем токен в ссылке

    return new Response(JSON.stringify({ link: inviteLink }), {
      status: 200,
    });
  } catch (error) {
    console.error('Ошибка при генерации ссылки для модератора:', error);
    return new Response(JSON.stringify({ message: 'Ошибка при генерации ссылки' }), {
      status: 500,
    });
  }
}
