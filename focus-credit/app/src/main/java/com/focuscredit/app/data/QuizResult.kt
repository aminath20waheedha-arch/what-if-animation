package com.focuscredit.app.data

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * One finished quiz. [taskId] and [dateEpochDay] say which scheduled session it was for
 * (null task = a practice quiz started from the Flashcards tab). The credit system uses these.
 */
@Entity(tableName = "quiz_results")
data class QuizResult(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val subject: String,
    val taskId: Long?,
    val dateEpochDay: Long,
    val correct: Int,
    val total: Int,
    val passed: Boolean,
    val finishedAtMillis: Long,
)

@Dao
interface QuizResultDao {
    @Insert
    suspend fun insert(result: QuizResult): Long

    @Query("SELECT * FROM quiz_results ORDER BY finishedAtMillis DESC")
    fun observeAll(): Flow<List<QuizResult>>
}
