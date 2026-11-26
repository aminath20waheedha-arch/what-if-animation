package com.focuscredit.app.quiz

import com.focuscredit.app.ui.flashcards.QUIZ_CARD_COUNT

object QuizRules {
    const val QUESTIONS = QUIZ_CARD_COUNT

    /** Pass with at least 40% right (i.e. fail only if more than 60% are wrong). */
    const val PASS_PERCENT = 40

    fun passed(correct: Int, total: Int): Boolean = total > 0 && correct * 100 >= total * PASS_PERCENT

    fun minToPass(total: Int): Int = (total * PASS_PERCENT + 99) / 100

    private fun normalize(s: String): String = s.lowercase().filter { it.isLetterOrDigit() }

    /** A hint only: true when the typed answer matches ignoring case, spaces and punctuation. */
    fun looksRight(typed: String, answer: String): Boolean {
        val t = normalize(typed)
        return t.isNotEmpty() && t == normalize(answer)
    }
}
