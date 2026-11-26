package com.focuscredit.app.quiz

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QuizRulesTest {
    @Test
    fun passMarkIsFourOutOfTen() {
        assertFalse(QuizRules.passed(3, 10)) // 7 wrong = 70% wrong -> fail
        assertTrue(QuizRules.passed(4, 10))  // 6 wrong = 60% wrong -> pass
        assertTrue(QuizRules.passed(10, 10))
        assertEquals(4, QuizRules.minToPass(10))
    }

    @Test
    fun emptyQuizNeverPasses() {
        assertFalse(QuizRules.passed(0, 0))
    }

    @Test
    fun looksRightIgnoresCaseSpacesAndPunctuation() {
        assertTrue(QuizRules.looksRight("f = MA", "F=ma"))
        assertTrue(QuizRules.looksRight(" Mitochondria. ", "mitochondria"))
        assertFalse(QuizRules.looksRight("force equals mass", "F=ma"))
        assertFalse(QuizRules.looksRight("", ""))
    }
}
