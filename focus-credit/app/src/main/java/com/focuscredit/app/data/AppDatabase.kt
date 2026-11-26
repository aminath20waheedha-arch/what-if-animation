package com.focuscredit.app.data

import android.content.Context
import com.focuscredit.app.credit.CreditEvent
import com.focuscredit.app.credit.CreditEventDao
import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [Task::class, Flashcard::class, QuizResult::class, CreditEvent::class],
    version = 4,
    exportSchema = true,
    autoMigrations = [
        AutoMigration(from = 1, to = 2), // v2 adds the flashcards table
        AutoMigration(from = 2, to = 3), // v3 adds quiz_results
        AutoMigration(from = 3, to = 4), // v4 adds credit_events + tasks.createdAtMillis
    ],
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun flashcardDao(): FlashcardDao
    abstract fun quizResultDao(): QuizResultDao
    abstract fun creditEventDao(): CreditEventDao

    companion object {
        @Volatile
        private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "focus_credit.db",
                ).build().also { instance = it }
            }
    }
}
