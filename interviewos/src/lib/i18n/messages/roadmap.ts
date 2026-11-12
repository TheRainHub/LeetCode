import { defineMessages } from "../define";

export const roadmap = defineMessages(
  {
    title: "Roadmap",
    description:
      "Your curriculum as a tree: arrows point from a topic to the topics that build on it. Colours show your status; highlighted topics are ready to start.",
    all: "All paths",
    allHelp: "Arrows show which paths build on lessons from another path.",
    next: "Next up",
    nextHelp: "Not started yet, and every prerequisite is at least practised.",
    progress: (practised: number, total: number) => `${practised} / ${total} practised`,
    minutes: (n: number) => `${n} min`,
    external: "Prerequisites from other paths",
    externalHelp: "Lessons in this path that build on topics from another path.",
    needs: (n: number) => `${n} from other paths`,
    openPath: "Open path",
    legend: "Legend",
    empty: "No lessons yet. Run npm run db:seed.",
  },
  {
    title: "Дорожная карта",
    description:
      "Программа в виде дерева: стрелки ведут от темы к темам, которые на ней строятся. Цвет — ваш статус; выделенные темы можно начинать.",
    all: "Все треки",
    allHelp: "Стрелки показывают, какие треки опираются на уроки из другого трека.",
    next: "Можно начинать",
    nextHelp: "Ещё не начато, и все предварительные темы как минимум в практике.",
    progress: (practised: number, total: number) => `${practised} / ${total} в практике`,
    minutes: (n: number) => `${n} мин`,
    external: "Предварительные темы из других треков",
    externalHelp: "Уроки этого трека, которые опираются на темы из другого трека.",
    needs: (n: number) => `${n} из других треков`,
    openPath: "Открыть трек",
    legend: "Обозначения",
    empty: "Уроков пока нет. Выполните npm run db:seed.",
  },
);
