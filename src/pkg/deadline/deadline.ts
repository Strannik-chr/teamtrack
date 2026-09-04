export type DeadlineStatus = "green" | "yellow" | "orange" | "red" | "gray" | "blue";

export const calculateDeadlineStatus = (
  deadline: Date | null | undefined,
  isCompleted: boolean
): DeadlineStatus => {
  if (isCompleted) {
    return "blue"; // проект/задача завершена
  }

  if (!deadline) {
    return "gray"; // нет дедлайна - возвращаем серый или можно другой по умолчанию, по ТЗ gray это если дедлайн прошёл, но без дедлайна пусть тоже будет gray
  }

  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "gray"; // дедлайн прошёл
  } else if (diffDays < 3) {
    return "red"; // меньше 3 дней
  } else if (diffDays <= 7) {
    return "orange"; // 3-7 дней
  } else if (diffDays <= 14) {
    return "yellow"; // 7-14 дней
  } else {
    return "green"; // больше 14 дней
  }
};
