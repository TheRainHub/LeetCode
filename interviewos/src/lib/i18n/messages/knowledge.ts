import { defineMessages } from "../define";

export const knowledge = defineMessages(
  {
    title: "Knowledge Base",
    description: "Every topic with its evidence-based status, accuracy and next review. Search the full text of all lessons.",
    search: "Search lessons and topics…",
    area: "Area",
    results: (n: number) => `${n} result(s)`,
    noResults: "Nothing matches your search.",
    columns: { topic: "Topic", status: "Status", accuracy: "Accuracy", review: "Next review", priority: "Priority" },
    areas: {
      dsa: "Algorithms & DS",
      java: "Java",
      "linux-networking": "Linux & Networking",
      backend: "Backend",
      "ts-react": "TypeScript & React",
      "system-design": "System Design",
      "ai-engineering": "AI Engineering",
      behavioral: "Communication",
    } as Record<string, string>,
    statusLegend: "How statuses are earned",
  },
  {
    title: "База знаний",
    description: "Все темы со статусом по фактам, точностью и датой следующего повторения. Поиск по полному тексту уроков.",
    search: "Поиск по урокам и темам…",
    area: "Область",
    results: (n: number) => `Найдено: ${n}`,
    noResults: "Ничего не найдено.",
    columns: { topic: "Тема", status: "Статус", accuracy: "Точность", review: "Повторение", priority: "Приоритет" },
    areas: {
      dsa: "Алгоритмы и СД",
      java: "Java",
      "linux-networking": "Linux и сети",
      backend: "Бэкенд",
      "ts-react": "TypeScript и React",
      "system-design": "Проектирование систем",
      "ai-engineering": "ИИ-инжиниринг",
      behavioral: "Коммуникация",
    } as Record<string, string>,
    statusLegend: "Как присваиваются статусы",
  },
);
