package com.focuscredit.app.ui.flashcards

import com.focuscredit.app.data.SubjectCount
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DecksTest {
    @Test
    fun mergesSubjectsIgnoringCaseAndSpaces() {
        val decks = mergeDecks(
            taskSubjects = listOf("physics ", "Maths"),
            cardCounts = listOf(SubjectCount("Physics", 4)),
            extraSubjects = setOf("Chemistry", "maths"),
        )
        assertEquals(listOf("Chemistry", "Maths", "Physics"), decks.map { it.subject })
        assertEquals(4, decks.first { it.subject == "Physics" }.cardCount)
        assertEquals(0, decks.first { it.subject == "Maths" }.cardCount)
    }

    @Test
    fun ignoresBlankSubjects() {
        assertTrue(mergeDecks(listOf("", "  "), emptyList(), emptySet()).isEmpty())
    }

    @Test
    fun quizReadyAtTenCards() {
        assertFalse(Deck("Physics", 9).quizReady)
        assertEquals(1, Deck("Physics", 9).cardsNeeded)
        assertTrue(Deck("Physics", 10).quizReady)
        assertEquals(0, Deck("Physics", 12).cardsNeeded)
    }
}
