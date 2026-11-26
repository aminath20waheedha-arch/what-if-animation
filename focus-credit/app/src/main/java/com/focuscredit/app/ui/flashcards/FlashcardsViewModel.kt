package com.focuscredit.app.ui.flashcards

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.focuscredit.app.data.AppDatabase
import com.focuscredit.app.data.Flashcard
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class FlashcardsViewModel(app: Application) : AndroidViewModel(app) {
    private val db = AppDatabase.get(app)
    private val cardDao = db.flashcardDao()

    /** Subjects created here that have no tasks or cards yet (kept until the app closes). */
    private val newSubjects = MutableStateFlow<Set<String>>(emptySet())

    val decks: StateFlow<List<Deck>> =
        combine(db.taskDao().observeAll(), cardDao.observeSubjectCounts(), newSubjects) { tasks, counts, extra ->
            mergeDecks(tasks.map { it.subject }, counts, extra)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _openSubject = MutableStateFlow<String?>(null)
    val openSubject: StateFlow<String?> = _openSubject

    @OptIn(ExperimentalCoroutinesApi::class)
    val openCards: StateFlow<List<Flashcard>> =
        _openSubject.flatMapLatest { s -> if (s == null) flowOf(emptyList()) else cardDao.observeForSubject(s) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun open(subject: String?) {
        _openSubject.value = subject
    }

    fun createSubject(name: String) {
        val clean = name.trim()
        if (clean.isEmpty()) return
        newSubjects.value = newSubjects.value + clean
        open(clean)
    }

    fun saveCard(card: Flashcard) = viewModelScope.launch {
        val clean = card.copy(question = card.question.trim(), answer = card.answer.trim())
        if (clean.id == 0L) cardDao.insert(clean) else cardDao.update(clean)
    }

    fun deleteCard(card: Flashcard) = viewModelScope.launch { cardDao.delete(card) }

    fun deleteAllCards(subject: String) = viewModelScope.launch {
        cardDao.deleteSubject(subject)
        newSubjects.value = newSubjects.value.filterNot { it.equals(subject, ignoreCase = true) }.toSet()
        open(null)
    }
}
