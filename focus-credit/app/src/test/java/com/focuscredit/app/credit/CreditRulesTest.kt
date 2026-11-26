package com.focuscredit.app.credit

import com.focuscredit.app.data.Task
import com.focuscredit.app.data.TaskKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset

class CreditRulesTest {
    private val zone = ZoneOffset.UTC
    private val thursday = LocalDate.of(2026, 11, 26)
    private fun millis(date: LocalDate, h: Int, m: Int = 0) = date.atTime(h, m).toInstant(zone).toEpochMilli()

    private fun event(amount: Int, at: Long) =
        CreditEvent(kind = CreditKind.PASSED, amount = amount, subject = "S", title = "T", taskId = null, dateEpochDay = null, atMillis = at)

    // Weekly Mon + Thu, 19:00–20:00, created long ago.
    private val task = Task(
        id = 7, title = "Revise", subject = "Physics", kind = TaskKind.STUDY,
        startMinute = 19 * 60, endMinute = 20 * 60,
        repeatDays = Task.dayBit(DayOfWeek.MONDAY) or Task.dayBit(DayOfWeek.THURSDAY),
        dateEpochDay = null, createdAtMillis = 0,
    )
    private val longAgo = millis(thursday.minusDays(30), 0)

    @Test
    fun balanceStartsAt100AndIsClampedAtEveryStep() {
        assertEquals(100, CreditRules.balance(emptyList()))
        // +10 at full stays 100, then -10 -> 90
        assertEquals(90, CreditRules.balance(listOf(event(10, 1), event(-10, 2))))
        // Twelve misses floor at 0; a pass afterwards gives 10, not -10.
        val misses = (1..12).map { event(-10, it.toLong()) }
        assertEquals(10, CreditRules.balance(misses + event(10, 100)))
    }

    @Test
    fun sessionIsMissedOnlyAfterGraceWindow() {
        val at2259 = thursday.atTime(22, 59)
        val at2300 = thursday.atTime(23, 0)
        val keyDates = { now: java.time.LocalDateTime ->
            CreditRules.findMissed(listOf(task), emptySet(), longAgo, now, zone).map { it.date }
        }
        assertTrue(thursday !in keyDates(at2259))
        assertTrue(thursday in keyDates(at2300))
    }

    @Test
    fun alreadyCountedSessionsAreSkipped() {
        val now = thursday.atTime(23, 30)
        val counted = setOf(SessionKey(7, thursday.toEpochDay()))
        val missed = CreditRules.findMissed(listOf(task), counted, longAgo, now, zone)
        assertTrue(missed.none { it.date == thursday })
        // Monday the 23rd is still missed.
        assertTrue(missed.any { it.date == LocalDate.of(2026, 11, 23) })
    }

    @Test
    fun sessionsBeforeCreditStartOrTaskCreationDontCount() {
        val now = thursday.atTime(23, 30)
        // Credit switched on this morning: only today's session counts.
        val startedToday = millis(thursday, 8)
        assertEquals(listOf(thursday), CreditRules.findMissed(listOf(task), emptySet(), startedToday, now, zone).map { it.date })
        // Task created at 20:30, after today's session ended: nothing counts.
        val newTask = task.copy(createdAtMillis = millis(thursday, 20, 30))
        assertTrue(CreditRules.findMissed(listOf(newTask), emptySet(), longAgo, now, zone).isEmpty())
    }

    @Test
    fun missedEventIsTimedAtEndOfGraceWindow() {
        val now = thursday.atTime(23, 30)
        val m = CreditRules.findMissed(listOf(task), emptySet(), millis(thursday, 8), now, zone).single()
        assertEquals(millis(thursday, 23), m.missedAtMillis)
    }
}
