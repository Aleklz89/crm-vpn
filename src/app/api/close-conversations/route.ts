import { PrismaClient } from '@prisma/client';
import { sendTelegramMessageToUser, sendTelegramMessageToAssistant } from './telegramHelpers';  

const prisma = new PrismaClient();

export async function POST() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); 
    const conversations = await prisma.conversation.findMany({
      where: {
        status: 'IN_PROGRESS',
        createdAt: { lt: oneHourAgo },
      },
      include: { user: true, assistant: true },
    });

    if (conversations.length === 0) {
      return new Response(JSON.stringify({ message: 'Нет активных диалогов, превышающих 1 час.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    for (const conversation of conversations) {
      if (conversation.lastMessageFrom === 'ASSISTANT') {
        // Получаем активный запрос
        const activeRequest = await prisma.assistantRequest.findFirst({
          where: {
            id: conversation.requestId,
            isActive: true,
          },
          include: { assistant: true },
        });

        if (activeRequest) {
          // Обновляем статус запроса
          await prisma.assistantRequest.update({
            where: { id: activeRequest.id },
            data: { status: 'COMPLETED', isActive: false },
          });

          // Обновляем статус ассистента
          if (activeRequest.assistant) {
            await prisma.assistant.update({
              where: { telegramId: activeRequest.assistant.telegramId },
              data: { isBusy: false },
            });
          } else {
            console.error('Ошибка: ассистент не найден для запроса');
          }

          // Обновляем статус разговора
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { status: 'COMPLETED' },
          });

          // Начисляем коины ассистенту и создаем запись в AssistantCoinTransaction
          if (activeRequest.assistant) {
            const coinsToAdd = 1; // Количество начисляемых коинов
            const reason = 'Автоматическое завершение диалога'; // Причина начисления

            // Обновляем баланс ассистента
            const updatedAssistant = await prisma.assistant.update({
              where: { telegramId: activeRequest.assistant.telegramId },
              data: { coins: { increment: coinsToAdd } },
            });

            // Создаем запись в AssistantCoinTransaction
            await prisma.assistantCoinTransaction.create({
              data: {
                assistantId: activeRequest.assistant.telegramId,
                amount: coinsToAdd,
                reason: reason,
              },
            });

            // Отправляем сообщение ассистенту
            await sendTelegramMessageToAssistant(
              updatedAssistant.telegramId.toString(),
              `Вам начислен ${coinsToAdd} коин за завершение диалога.`
            );
          }

          // Отправляем сообщение пользователю
          await sendTelegramMessageToUser(
            conversation.userId.toString(),
            'Диалог завершен.'
          );
        } else {
          console.error('Ошибка: активный запрос не найден');
        }
      } else {
        // Обработка отклонения запроса
        await handleRejectRequest(conversation.requestId.toString(), conversation.assistantId);
      }
    }

    return new Response(JSON.stringify({ message: 'Диалоги обновлены.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Ошибка при закрытии диалогов:', error);
    return new Response(JSON.stringify({ error: 'Ошибка на сервере' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


async function handleRejectRequest(requestId: string, assistantTelegramId: bigint) {
  try {
    
    const assistantRequest = await prisma.assistantRequest.findUnique({
      where: { id: BigInt(requestId) },
      include: { conversation: true },
    });

    const ignoredAssistants = assistantRequest?.ignoredAssistants || [];

    
    ignoredAssistants.push(assistantTelegramId);

    
    if (assistantRequest?.conversation) {
      await prisma.conversation.update({
        where: { id: assistantRequest.conversation.id },
        data: { status: 'ABORTED' }, 
      });
    }

    
    await prisma.requestAction.create({
      data: {
        requestId: BigInt(requestId),
        assistantId: assistantTelegramId,
        action: 'REJECTED',
      },
    });

    
    await prisma.assistantRequest.update({
      where: { id: BigInt(requestId) },
      data: {
        status: 'PENDING',  
        isActive: true,      
        assistantId: null,   
        ignoredAssistants,   
      },
    });

    
    const newAssistant = await findNewAssistant(BigInt(requestId), ignoredAssistants);

    
    if (newAssistant) {
      await prisma.assistantRequest.update({
        where: { id: BigInt(requestId) },
        data: {
          assistantId: newAssistant.telegramId, 
        },
      });

      
      await sendTelegramMessageToAssistant(
        newAssistant.telegramId.toString(),
        'Новый запрос от пользователя.'
      );
    } else {
      console.error('Нет доступных ассистентов.');
    }

    
    await prisma.assistant.update({
      where: { telegramId: assistantTelegramId },
      data: { isBusy: false },
    });
  } catch (error) {
    console.error('Ошибка при отклонении запроса:', error);
  }
}



async function findNewAssistant(requestId: bigint, ignoredAssistants: bigint[]) {
  
  const availableAssistants = await prisma.assistant.findMany({
    where: {
      isWorking: true,
      isBusy: false,
      telegramId: {
        notIn: ignoredAssistants, 
      },
    },
  });

  
  const assistantsWithPenalty = await Promise.all(
    availableAssistants.map(async (assistant) => {
      const penaltyPoints = await getAssistantPenaltyPoints(assistant.telegramId);
      return { ...assistant, penaltyPoints };
    })
  );

  
  assistantsWithPenalty.sort((a, b) => {
    if (a.penaltyPoints === b.penaltyPoints) {
      
      return (b.lastActiveAt?.getTime() || 0) - (a.lastActiveAt?.getTime() || 0);
    }
    return a.penaltyPoints - b.penaltyPoints; 
  });

  
  const selectedAssistant = assistantsWithPenalty[0];

  
  if (!selectedAssistant) {
    await prisma.assistantRequest.update({
      where: { id: requestId },
      data: { ignoredAssistants: [] }, 
    });
    return findNewAssistant(requestId, []);
  }

  return selectedAssistant;
}


async function getAssistantPenaltyPoints(assistantId: bigint) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const actions = await prisma.requestAction.findMany({
    where: {
      assistantId: assistantId,
      createdAt: {
        gte: yesterday, 
      },
    },
  });

  let penaltyPoints = 0;
  for (const action of actions) {
    if (action.action === 'REJECTED') {
      penaltyPoints += 1; 
    } else if (action.action === 'IGNORED') {
      penaltyPoints += 3; 
    }
  }

  return penaltyPoints;
}