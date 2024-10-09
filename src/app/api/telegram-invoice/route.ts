import { Bot } from "grammy";

const bot = new Bot(process.env.TELEGRAM_USER_BOT_TOKEN!);

export async function POST() {
  try {

    const title = "Оплата через Звезды Telegram";
    const description = "Оплата за товар через звезды Telegram.";
    const payload = "{}";
    const currency = "XTR";
    const prices = [{ amount: 500, label: "Оплата через звезды" }];


    const invoiceLink = await bot.api.createInvoiceLink(
      title,
      description,
      payload,
      "",
      currency,
      prices
    );


    return new Response(JSON.stringify({ invoiceLink }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Ошибка создания инвойса:", error);
    return new Response(JSON.stringify({ message: "Ошибка создания инвойса" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}