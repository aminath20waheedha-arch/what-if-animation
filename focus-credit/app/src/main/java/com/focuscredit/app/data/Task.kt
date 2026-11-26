package com.focuscredit.app.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.DayOfWeek
import java.time.LocalDate

enum class TaskKind(val label: String) {
    STUDY("Study"),
    CLASS("Class"),
}

/**
 * One scheduled block of time.
 *
 * Times are stored as "minutes since midnight" (e.g. 19:30 = 1170).
 * [repeatDays] is a bitmask: Monday = bit 0 ... Sunday = bit 6.
 * When [repeatDays] is 0 the task happens once, on [dateEpochDay].
 */
@Entity(tableName = "tasks")
data class Task(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val subject: String,
    val kind: TaskKind,
    val startMinute: Int,
    val endMinute: Int,
    val repeatDays: Int,
    val dateEpochDay: Long?,
    /** When the task was created; sessions that ended before this never count as missed. 0 = unknown (pre-v4). */
    @ColumnInfo(defaultValue = "0") val createdAtMillis: Long = System.currentTimeMillis(),
) {
    val isRepeating: Boolean get() = repeatDays != 0

    fun occursOn(date: LocalDate): Boolean =
        if (isRepeating) repeatDays and dayBit(date.dayOfWeek) != 0
        else dateEpochDay == date.toEpochDay()

    companion object {
        fun dayBit(day: DayOfWeek): Int = 1 shl (day.value - 1)
    }
}
