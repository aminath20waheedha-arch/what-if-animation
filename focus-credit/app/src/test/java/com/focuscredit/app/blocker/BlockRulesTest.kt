package com.focuscredit.app.blocker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BlockRulesTest {
    private val tiktok = "com.zhiliaoapp.musically"
    private val insta = "com.instagram.android"

    @Test
    fun blocksTikTokAndInstagramOnlyAtZeroCredit() {
        assertTrue(BlockRules.shouldBlock(tiktok, 0, enabled = true))
        assertTrue(BlockRules.shouldBlock(insta, 0, enabled = true))
        assertFalse(BlockRules.shouldBlock(insta, 10, enabled = true))
    }

    @Test
    fun neverBlocksWhenSwitchedOffOrBalanceUnknown() {
        assertFalse(BlockRules.shouldBlock(tiktok, 0, enabled = false))
        assertFalse(BlockRules.shouldBlock(tiktok, null, enabled = true))
    }

    @Test
    fun otherAppsAreNeverBlocked() {
        assertFalse(BlockRules.shouldBlock("com.whatsapp", 0, enabled = true))
        assertFalse(BlockRules.shouldBlock(null, 0, enabled = true))
    }

    @Test
    fun friendlyNames() {
        assertEquals("TikTok", BlockRules.label(tiktok))
        assertEquals("This app", BlockRules.label("x.y"))
    }
}
