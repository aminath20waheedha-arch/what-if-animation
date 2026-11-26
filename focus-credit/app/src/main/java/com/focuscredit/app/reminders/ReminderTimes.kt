package com.focuscredit.app.reminders

import com.focuscredit.app.data.Task
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

enum class ReminderType { START, END }

/** Pure date math for working out when the next reminder should fire. */
object ReminderTimes {

    /**
     * The next moment strictly after [after] at which [task] starts (or ends),
     * or null if it never happens again (a one-time task in the past).
     */
    fun next(task: Task, type: ReminderType, after: LocalDateTime): LocalDateTime? {
        val minute = if (type == ReminderType.START) task.startMinute else task.endMinute
        val time = LocalTime.of(minute / 60, minute % 60)

        if (!task.isRepeating) {
            val day = task.dateEpochDay ?: return null
            return LocalDate.ofEpochDay(day).atTime(time).takeIf { it.isAfter(after) }
        }

        // A weekly task always recurs within the next 8 days (today + 7).
        for (offset in 0L..7L) {
            val date = after.toLocalDate().plusDays(offset)
            if (task.occursOn(date)) {
                val at = date.atTime(time)
                if (at.isAfter(after)) return at
            }
        }
        return null
    }
}
