package com.focuscredit.app.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface FlashcardDao {
    @Query("SELECT * FROM flashcards WHERE subject = :subject COLLATE NOCASE ORDER BY id ASC")
    fun observeForSubject(subject: String): Flow<List<Flashcard>>

    @Query("SELECT subject, COUNT(*) AS count FROM flashcards GROUP BY subject COLLATE NOCASE")
    fun observeSubjectCounts(): Flow<List<SubjectCount>>

    /** Random cards for a quiz (used in step 4). */
    @Query("SELECT * FROM flashcards WHERE subject = :subject COLLATE NOCASE ORDER BY RANDOM() LIMIT :limit")
    suspend fun randomForSubject(subject: String, limit: Int): List<Flashcard>

    @Insert
    suspend fun insert(card: Flashcard): Long

    @Update
    suspend fun update(card: Flashcard)

    @Delete
    suspend fun delete(card: Flashcard)

    @Query("DELETE FROM flashcards WHERE subject = :subject COLLATE NOCASE")
    suspend fun deleteSubject(subject: String)
}
