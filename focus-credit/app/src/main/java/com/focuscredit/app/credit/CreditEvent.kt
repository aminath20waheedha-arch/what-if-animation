package com.focuscredit.app.credit

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

enum class CreditKind { PASSED, FAILED, MISSED }

/**
 * One change to the credit balance. Each scheduled session (task + day) can produce at
 * most one event, enforced by the unique index, so a session can't be counted twice and
 * a missed penalty stays even if the task is later deleted.
 */
@Entity(
    tableName = "credit_events",
    indices = [Index(value = ["taskId", "dateEpochDay"], unique = true)],
)
data class CreditEvent(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val kind: CreditKind,
    val amount: Int,
    val subject: String,
    val title: String,
    val taskId: Long?,
    val dateEpochDay: Long?,
    val atMillis: Long,
)

data class SessionKey(val taskId: Long, val dateEpochDay: Long)

@Dao
interface CreditEventDao {
    /** Returns -1 if this session already has an event. */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnore(event: CreditEvent): Long

    @Query("SELECT * FROM credit_events ORDER BY atMillis ASC")
    fun observeAll(): Flow<List<CreditEvent>>

    @Query("SELECT * FROM credit_events ORDER BY atMillis ASC")
    suspend fun getAll(): List<CreditEvent>

    @Query("SELECT taskId, dateEpochDay FROM credit_events WHERE taskId IS NOT NULL AND dateEpochDay >= :sinceEpochDay")
    suspend fun sessionKeysSince(sinceEpochDay: Long): List<SessionKey>

    @Query("SELECT * FROM credit_events WHERE taskId = :taskId AND dateEpochDay = :dateEpochDay LIMIT 1")
    suspend fun forSession(taskId: Long, dateEpochDay: Long): CreditEvent?
}
