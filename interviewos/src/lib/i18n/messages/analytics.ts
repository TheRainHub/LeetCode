import { defineMessages } from "../define";

export const analytics = defineMessages(
  {
    title: "Analytics",
    description:
      "Observed performance from your recorded attempts, reviews and interviews — kept separate from estimated readiness.",
    observedTag: "Observed",
    estimatedTag: "Estimated",
    showTable: "Show data table",
    accuracy: {
      title: "Accuracy by topic",
      help: (n: number) =>
        `Correct share of graded results (quizzes, explanations, coding, reviews, interviews). Topics need at least ${n} results.`,
      insufficient: (n: number) => `${n} topic(s) with some results but not enough data yet`,
      topic: "Topic",
      results: "Results",
    },
    coding: {
      title: "Coding practice",
      avgTime: "Avg. time to a passing solution",
      independent: "Solved independently",
      withHints: "Solved with hints",
      withSolution: "Solved after viewing solution",
      problem: "Problem",
      best: "Best result",
      time: "Avg. time",
    },
    weekly: {
      title: "Weekly learning time",
      help: "Logged active time (minutes) by activity, last 8 weeks.",
      series: {
        learning: "Lessons & exercises",
        coding: "Coding",
        review: "Reviews",
        other: "Labs, interviews & experience",
      },
      week: "Week of",
    },
    retention: {
      title: "Review retention",
      help: (n: number) =>
        `Share of card reviews recalled (not graded “Again”). Weeks need at least ${n} reviews.`,
      reviews: "Reviews",
    },
    interviews: {
      title: "Mock interview scores",
      help: "Overall evaluation score per completed mock interview.",
      date: "Date",
      score: "Score",
    },
    calibration: {
      title: "Confidence vs performance",
      help: "Each dot is a topic: your self-reported confidence against observed accuracy. Dots far above or below the diagonal show over- or under-confidence.",
      confidence: "Confidence (1–5)",
      accuracy: "Accuracy (%)",
    },
    readiness: {
      title: "Readiness by company",
      help: "Estimated readiness is modelled from topic statuses; observed scores come from mock interviews. They are shown separately on purpose.",
      company: "Company",
      estimated: "Estimated readiness",
      observed: "Observed mock average",
    },
  },
  {
    title: "Аналитика",
    description:
      "Наблюдаемые результаты по вашим попыткам, повторениям и собеседованиям — отдельно от оценки готовности.",
    observedTag: "Наблюдение",
    estimatedTag: "Оценка",
    showTable: "Показать таблицу данных",
    accuracy: {
      title: "Точность по темам",
      help: (n: number) =>
        `Доля верных оценённых результатов (тесты, объяснения, код, повторения, собеседования). Для темы нужно минимум ${n} результата.`,
      insufficient: (n: number) => `Тем с результатами, но пока без достаточных данных: ${n}`,
      topic: "Тема",
      results: "Результатов",
    },
    coding: {
      title: "Практика программирования",
      avgTime: "Среднее время до рабочего решения",
      independent: "Решено самостоятельно",
      withHints: "Решено с подсказками",
      withSolution: "Решено после просмотра решения",
      problem: "Задача",
      best: "Лучший результат",
      time: "Среднее время",
    },
    weekly: {
      title: "Время занятий по неделям",
      help: "Записанное активное время (минуты) по видам занятий за последние 8 недель.",
      series: {
        learning: "Уроки и упражнения",
        coding: "Код",
        review: "Повторения",
        other: "Лабораторные, собеседования и опыт",
      },
      week: "Неделя с",
    },
    retention: {
      title: "Удержание при повторении",
      help: (n: number) =>
        `Доля карточек, которые вы вспомнили (не «Снова»). Для недели нужно минимум ${n} повторений.`,
      reviews: "Повторений",
    },
    interviews: {
      title: "Оценки пробных собеседований",
      help: "Общая оценка каждого завершённого пробного собеседования.",
      date: "Дата",
      score: "Оценка",
    },
    calibration: {
      title: "Уверенность и результат",
      help: "Каждая точка — тема: ваша уверенность против наблюдаемой точности. Точки далеко от диагонали показывают пере- или недооценку.",
      confidence: "Уверенность (1–5)",
      accuracy: "Точность (%)",
    },
    readiness: {
      title: "Готовность по компаниям",
      help: "Оценка готовности моделируется по статусам тем; наблюдаемые оценки берутся из пробных собеседований. Они намеренно показаны отдельно.",
      company: "Компания",
      estimated: "Оценка готовности",
      observed: "Средняя оценка собеседований",
    },
  },
);
