package com.focuscredit.app.quiz

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.focuscredit.app.credit.CreditOutcome
import com.focuscredit.app.credit.CreditRepository
import com.focuscredit.app.data.AppDatabase
import com.focuscredit.app.data.Flashcard
import com.focuscredit.app.data.QuizResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface QuizState {
    data object Loading : QuizState
    data class NotEnoughCards(val have: Int) : QuizState
    data class Asking(
        val index: Int,
        val total: Int,
        val card: Flashcard,
        val typed: String,
        val revealed: Boolean,
    ) : QuizState
    data class Finished(
        val correct: Int,
        val total: Int,
        val passed: Boolean,
        val missed: List<Flashcard>,
        /** null while the credit change is being worked out. */
        val credit: CreditOutcome? = null,
    ) : QuizState
}

class QuizViewModel(app: Application) : AndroidViewModel(app) {
    private val db = AppDatabase.get(app)
    private val creditRepo = CreditRepository(app)

    private val _state = MutableStateFlow<QuizState>(QuizState.Loading)
    val state: StateFlow<QuizState> = _state

    private var request: QuizRequest? = null
    private var cards: List<Flashcard> = emptyList()
    private val marks = mutableListOf<Boolean>()

    fun start(req: QuizRequest) {
        if (request == req) return // already running (e.g. after rotation)
        request = req
        marks.clear()
        _state.value = QuizState.Loading
        viewModelScope.launch {
            cards = db.flashcardDao().randomForSubject(req.subject, QuizRules.QUESTIONS)
            _state.value = if (cards.size < QuizRules.QUESTIONS) QuizState.NotEnoughCards(cards.size) else ask(0)
        }
    }

    private fun ask(index: Int) = QuizState.Asking(index, cards.size, cards[index], typed = "", revealed = false)

    fun type(text: String) {
        val s = _state.value as? QuizState.Asking ?: return
        if (!s.revealed) _state.value = s.copy(typed = text)
    }

    fun reveal() {
        val s = _state.value as? QuizState.Asking ?: return
        _state.value = s.copy(revealed = true)
    }

    /** Records the self-mark for the current card and moves on (or finishes). */
    fun mark(gotIt: Boolean) {
        val s = _state.value as? QuizState.Asking ?: return
        marks += gotIt
        val next = s.index + 1
        if (next < cards.size) {
            _state.value = ask(next)
        } else {
            finish()
        }
    }

    private fun finish() {
        val req = request ?: return
        val correct = marks.count { it }
        val total = cards.size
        val passed = QuizRules.passed(correct, total)
        val missed = cards.filterIndexed { i, _ -> !marks[i] }
        val finished = QuizState.Finished(correct, total, passed, missed)
        _state.value = finished
        viewModelScope.launch {
            val result = QuizResult(
                subject = req.subject,
                taskId = req.taskId,
                dateEpochDay = req.dateEpochDay,
                correct = correct,
                total = total,
                passed = passed,
                finishedAtMillis = System.currentTimeMillis(),
            )
            db.quizResultDao().insert(result)
            _state.value = finished.copy(credit = creditRepo.recordQuiz(result))
        }
    }
}
