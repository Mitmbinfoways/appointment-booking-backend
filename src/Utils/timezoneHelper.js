/**
 * Utility functions for Automatic Global Timezone conversions.
 */

/**
 * Converts a time string "HH:MM" on a specific date "YYYY-MM-DD" from source timezone to target timezone.
 * Returns { time: "HH:MM", date: "YYYY-MM-DD" } in the target timezone.
 */
function convertTimeBetweenTimezones(timeStr, dateStr, fromTimezone = "UTC", toTimezone = "UTC") {
  if (!timeStr || !dateStr) return { time: timeStr, date: dateStr };
  if (fromTimezone === toTimezone) return { time: timeStr, date: dateStr };

  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Create a Date object assuming UTC initially
    const tempDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

    // Get wall clock representation in fromTimezone to determine offset difference
    const fromFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: fromTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const fromParts = Object.fromEntries(
      fromFormatter.formatToParts(tempDate).map((p) => [p.type, p.value])
    );

    const fromYear = parseInt(fromParts.year, 10);
    const fromMonth = parseInt(fromParts.month, 10) - 1;
    const fromDay = parseInt(fromParts.day, 10);
    let fromHour = parseInt(fromParts.hour, 10);
    if (fromHour === 24) fromHour = 0;
    const fromMinute = parseInt(fromParts.minute, 10);

    const fromAsUtc = Date.UTC(fromYear, fromMonth, fromDay, fromHour, fromMinute, 0);
    const offsetMs = fromAsUtc - tempDate.getTime();

    // Actual UTC timestamp of (dateStr + timeStr) in fromTimezone
    const actualUtcTime = tempDate.getTime() - offsetMs;
    const targetDate = new Date(actualUtcTime);

    // Format targetDate into toTimezone
    const toFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: toTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const toParts = Object.fromEntries(
      toFormatter.formatToParts(targetDate).map((p) => [p.type, p.value])
    );

    const resYear = toParts.year;
    const resMonth = toParts.month;
    const resDay = toParts.day;
    let resHour = parseInt(toParts.hour, 10);
    if (resHour === 24) resHour = 0;
    const resMinute = toParts.minute;

    const formattedTime = `${String(resHour).padStart(2, "0")}:${String(resMinute).padStart(2, "0")}`;
    const formattedDate = `${resYear}-${resMonth}-${resDay}`;

    return { time: formattedTime, date: formattedDate };
  } catch (error) {
    console.error("Error converting timezone:", error);
    return { time: timeStr, date: dateStr };
  }
}

/**
 * Returns formatted timezone label e.g., "Asia/Kolkata (UTC+05:30)"
 */
function getTimezoneLabel(timeZone = "UTC") {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "";
    return tzPart ? `${timeZone} (${tzPart})` : timeZone;
  } catch (e) {
    return timeZone;
  }
}

module.exports = {
  convertTimeBetweenTimezones,
  getTimezoneLabel,
};
