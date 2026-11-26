package com.focuscredit.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.focuscredit.app.reminders.Notifications
import com.focuscredit.app.ui.ScheduleApp
import com.focuscredit.app.ui.theme.FocusCreditTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Notifications.ensureChannel(this)
        setContent {
            FocusCreditTheme {
                ScheduleApp()
            }
        }
    }
}
