package com.focuscredit.app.ui.flashcards

import com.focuscredit.app.data.SubjectCount

/** A quiz picks this many cards, so a deck needs at least this many to be quiz-ready. */
const val QUIZ_CARD_COUNT = 10

data class Deck(val subject: String, val cardCount: Int) {
    val quizReady: Boolean get() = cardCount >= QUIZ_CARD_COUNT
    val cardsNeeded: Int get() = (QUIZ_CARD_COUNT - cardCount).coerceAtLeast(0)
}

/**
 * Builds the list of decks from every place a subject can come from: scheduled tasks,
 * existing flashcards, and subjects just created on the Flashcards tab.
 * Subjects are matched ignoring case and surrounding spaces ("physics " == "Physics").
 */
fun mergeDecks(
    taskSubjects: List<String>,
    cardCounts: List<SubjectCount>,
    extraSubjects: Collection<String>,
): List<Deck> {
    val byKey = linkedMapOf<String, Deck>()
    fun add(name: String, count: Int) {
        val clean = name.trim()
        if (clean.isEmpty()) return
        val key = clean.lowercase()
        val existing = byKey[key]
        byKey[key] = if (existing == null) Deck(clean, count) else existing.copy(cardCount = existing.cardCount + count)
    }
    cardCounts.forEach { add(it.subject, it.count) }
    taskSubjects.forEach { add(it, 0) }
    extraSubjects.forEach { add(it, 0) }
    return byKey.values.sortedBy { it.subject.lowercase() }
}
