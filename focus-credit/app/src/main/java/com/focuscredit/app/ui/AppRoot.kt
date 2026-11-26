package com.focuscredit.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.focuscredit.app.ui.flashcards.FlashcardsTab

private enum class Tab(val label: String, val icon: ImageVector) {
    SCHEDULE("Schedule", Icons.Filled.DateRange),
    FLASHCARDS("Flashcards", Icons.Filled.Edit),
}

/** App shell with the bottom tab bar. */
@Composable
fun AppRoot() {
    var tab by rememberSaveable { mutableStateOf(Tab.SCHEDULE) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t },
                        icon = { Icon(t.icon, contentDescription = null) },
                        label = { Text(t.label) },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding).consumeWindowInsets(padding)) {
            when (tab) {
                Tab.SCHEDULE -> ScheduleApp()
                Tab.FLASHCARDS -> FlashcardsTab()
            }
        }
    }
}
