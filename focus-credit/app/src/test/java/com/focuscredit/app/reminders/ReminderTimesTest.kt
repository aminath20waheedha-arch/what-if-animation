package com.focuscredit.app.reminders

import com.focuscredit.app.data.Task
import com.focuscredit.app.data.TaskKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime

class ReminderTimesTest {
    // 2026-11-26 is a Thursday.
    private val thursday = LocalDate.of(2026, 11, 26)

    private fun task(repeat: Set<DayOfWeek> = emptySet(), date: LocalDate? = null) = Task(
        id = 1,
        title = "Revise",
        subject = "Physics",
        kind = TaskKind.STUDY,
        startMinute = 19 * 60,
        endMinute = 20 * 60,
        repeatDays = repeat.fold(0) { acc, d -> acc or Task.dayBit(d) },
        dateEpochDay = date?.toEpochDay(),
    )

    @Test
    fun oneTimeTaskLaterToday() {
        val t = task(date = thursday)
        val now = thursday.atTime(10, 0)
        assertEquals(thursday.atTime(19, 0), ReminderTimes.next(t, ReminderType.START, now))
        assertEquals(thursday.atTime(20, 0), ReminderTimes.next(t, ReminderType.END, now))
    }

    @Test
    fun oneTimeTaskInThePastNeverFires() {
        val t = task(date = thursday)
        assertNull(ReminderTimes.next(t, ReminderType.START, thursday.atTime(21, 0)))
    }

    @Test
    fun repeatingTaskLaterToday() {
        val t = task(repeat = setOf(DayOfWeek.THURSDAY))
        assertEquals(thursday.atTime(19, 0), ReminderTimes.next(t, ReminderType.START, thursday.atTime(8, 0)))
    }

    @Test
    fun repeatingTaskAlreadyPassedTodayGoesToNextDay() {
        val t = task(repeat = setOf(DayOfWeek.THURSDAY, DayOfWeek.SATURDAY))
        assertEquals(
            LocalDate.of(2026, 11, 28).atTime(19, 0),
            ReminderTimes.next(t, ReminderType.START, thursday.atTime(19, 0, 30)),
        )
    }

    @Test
    fun weeklyTaskOnlyOnTodayWrapsAWeek() {
        val t = task(repeat = setOf(DayOfWeek.THURSDAY))
        val justAfterStart: LocalDateTime = thursday.atTime(19, 0, 30)
        assertEquals(thursday.plusWeeks(1).atTime(19, 0), ReminderTimes.next(t, ReminderType.START, justAfterStart))
        // ...but today's end reminder is still ahead.
        assertEquals(thursday.atTime(20, 0), ReminderTimes.next(t, ReminderType.END, justAfterStart))
    }
}
