export const weekMapZh = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const calendarGrid = 42; // 7 * 6 grid

/**
 * Check if leap year
 * @param year
 * @returns
 */
const isLeap = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 100 === 0;
};

/**
 * Get days in month
 * @param year
 * @param month
 * @returns
 */
const getDays = (year, month) => {
  const feb = isLeap(year) ? 29 : 28;
  const daysPerMonth = [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysPerMonth[month];
};

/**
 * Get days in next/previous month
 * @param date
 * @param type "next" | "last"
 * @returns
 */
const getNextOrLastMonthDays = (date, type) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (type === "last") {
    const lastMonth = month === 0 ? 11 : month - 1;
    const lastYear = lastMonth === 11 ? year - 1 : year;
    return {
      year: lastYear,
      month: lastMonth,
      days: getDays(lastYear, lastMonth),
    };
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = nextMonth === 0 ? year + 1 : year;
  return {
    year: nextYear,
    month: nextMonth,
    days: getDays(nextYear, nextMonth),
  };
};

export const generateCalendar = (date) => {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
  // Current month days
  const days = getDays(currentYear, currentMonth);
  // Get trailing/leading days to fill calendar gaps
  const {
    days: lastMonthDays,
    year: lastMonthYear,
    month: lastMonth,
  } = getNextOrLastMonthDays(date, "last");
  const { year: nextMonthYear, month: nextMonth } = getNextOrLastMonthDays(
    date,
    "next"
  );
  // Day of week for the 1st
  const weekIndex = new Date(`${currentYear}/${currentMonth + 1}/1`).getDay();
  // Next month days shown at end
  const trailDays = calendarGrid - weekIndex - days;
  let trailVal = 0;
  const calendarTable = [];
  for (let i = 0; i < calendarGrid; i++) {
    // Fill previous month days
    if (i < weekIndex) {
      calendarTable[i] = {
        year: lastMonthYear,
        month: lastMonth,
        day: lastMonthDays - weekIndex + i + 1,
        isCurrentMonth: false,
      };
      // Fill next month days
    } else if (i >= days + weekIndex) {
      if (trailVal < trailDays) {
        trailVal += 1;
      }
      calendarTable[i] = {
        year: nextMonthYear,
        month: nextMonth,
        day: trailVal,
        isCurrentMonth: false,
      };
    }
  }
  // Fill current month dates
  for (let d = 1; d <= days; d++) {
    calendarTable[weekIndex + d - 1] = {
      year: currentYear,
      month: currentMonth,
      day: d,
      isCurrentMonth: true,
    };
  }

  return calendarTable;
};

export default {
  weekMapZh,
  generateCalendar,
};
