package com.focuscredit.app.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** One question/answer card. Cards are grouped into decks by [subject] (case-insensitive). */
@Entity(tableName = "flashcards", indices = [Index("subject")])
data class Flashcard(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val subject: String,
    val question: String,
    val answer: String,
)

/** Row returned when counting cards per subject. */
data class SubjectCount(val subject: String, val count: Int)
