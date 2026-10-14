import type { Locale } from "@/lib/locale";

export type AdminAiErrorCode =
  | "timeout"
  | "auth"
  | "rate"
  | "upstream"
  | "empty"
  | "network"
  | "too-long"
  | "no-key"
  | "blank";

const TEXT: Record<Locale, Record<AdminAiErrorCode, string>> = {
  uz: {
    timeout: "Javob vaqti tugadi. Qayta urinib ko‘ring.",
    auth: "ChatGPT kaliti rad etildi. Kalitni yangilang.",
    rate: "Juda ko‘p so‘rov. Birozdan keyin qayta yuboring.",
    upstream: "ChatGPT hozir javob bermadi. Qayta urinib ko‘ring.",
    empty: "ChatGPT bo‘sh javob qaytardi. Qayta urinib ko‘ring.",
    network: "Tarmoq xatosi. Qayta urinib ko‘ring.",
    "too-long": "Matn juda uzun. 4000 belgigacha qisqartiring.",
    "no-key": "ChatGPT kaliti ulanmagan. AI yordamchiga kalitni bir marta yozing.",
    blank: "Savol yozing.",
  },
  ru: {
    timeout: "Время ответа вышло. Попробуйте ещё раз.",
    auth: "Ключ ChatGPT отклонён. Обновите ключ.",
    rate: "Слишком много запросов. Подождите и отправьте снова.",
    upstream: "ChatGPT сейчас не ответил. Попробуйте ещё раз.",
    empty: "ChatGPT вернул пустой ответ. Попробуйте ещё раз.",
    network: "Ошибка сети. Попробуйте ещё раз.",
    "too-long": "Текст слишком длинный. Сократите до 4000 символов.",
    "no-key": "Ключ ChatGPT не подключён. Введите его один раз в помощнике.",
    blank: "Напишите вопрос.",
  },
  en: {
    timeout: "The reply timed out. Try again.",
    auth: "The ChatGPT key was rejected. Update the key.",
    rate: "Too many requests. Wait a moment and try again.",
    upstream: "ChatGPT did not answer. Try again.",
    empty: "ChatGPT returned an empty reply. Try again.",
    network: "Network error. Try again.",
    "too-long": "The text is too long. Shorten it to 4000 characters.",
    "no-key": "ChatGPT is not connected. Enter the key once in the helper.",
    blank: "Write a question.",
  },
  kaa: {
    timeout: "Juwap waqtı tawsıldı. Qayta urınıp kóriń.",
    auth: "ChatGPT giltı qabıl etilmedi. Giltti jańalań.",
    rate: "So‘rawlar júdá kóp. Birozdan keyin qayta jiberiń.",
    upstream: "ChatGPT házir juwap bermedi. Qayta urınıp kóriń.",
    empty: "ChatGPT bos juwap qaytardı. Qayta urınıp kóriń.",
    network: "Tarmaq qáteligi. Qayta urınıp kóriń.",
    "too-long": "Tekst júdá uzın. 4000 belgige shekem qısqartıń.",
    "no-key": "ChatGPT giltı jalǵanbaǵan. Járdemshige giltin bir márte jazıń.",
    blank: "Soraw jazıń.",
  },
};

export function adminAiFailure(
  code: AdminAiErrorCode,
  locale: Locale = "uz",
) {
  const http =
    code === "rate"
      ? 429
      : code === "auth"
        ? 401
        : code === "too-long"
          ? 400
          : code === "no-key" || code === "blank"
            ? 400
            : code === "timeout"
              ? 504
              : code === "empty"
                ? 502
                : 502;
  return {
    ok: false as const,
    error: code,
    message: TEXT[locale][code],
    status: http,
  };
}

export function adminAiCodeFromStatus(status: number): AdminAiErrorCode {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate";
  if (status === 408 || status === 504) return "timeout";
  return "upstream";
}
