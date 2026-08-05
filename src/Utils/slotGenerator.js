const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Generates slots of a specific duration between start and end times, excluding breaks.
 * @param {string} startTime - format "HH:MM"
 * @param {string} endTime - format "HH:MM"
 * @param {number} durationMinutes - interval size in minutes
 * @param {Array<{startTime: string, endTime: string}>} breakTimes - break time spans
 * @returns {Array<{startTime: string, endTime: string, status: string, bookingsCount: number}>}
 */
function generateSlots(startTime, endTime, durationMinutes, breakTimes = []) {
  if (!durationMinutes || durationMinutes <= 0) return [];
  const slots = [];
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  let current = startMins;

  const parsedBreaks = breakTimes.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  while (current + durationMinutes <= endMins) {
    const slotStart = current;
    const slotEnd = current + durationMinutes;

    // Check if slot overlaps with any break
    const overlapsBreak = parsedBreaks.some((b) => {
      return slotStart < b.end && slotEnd > b.start;
    });

    slots.push({
      startTime: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
      status: overlapsBreak ? "break" : "available",
      bookingsCount: 0,
    });

    current += durationMinutes;
  }

  return slots;
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  generateSlots,
};
