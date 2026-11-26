package com.focuscredit.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.focuscredit.app.quiz.QuizRequest
import com.focuscredit.app.reminders.Notifications
import com.focuscredit.app.ui.AppRoot
import com.focuscredit.app.ui.theme.FocusCreditTheme

class MainActivity : ComponentActivity() {
    /** Set when the app is opened from a "Time's up" notification. */
    private var quizRequest by mutableStateOf<QuizRequest?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Notifications.ensureChannel(this)
        // Only on a fresh start, so rotating the screen doesn't restart a finished quiz.
        if (savedInstanceState == null) consumeQuizIntent(intent)
        setContent {
            FocusCreditTheme {
                AppRoot(quiz = quizRequest, onQuizChange = { quizRequest = it })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        consumeQuizIntent(intent)
    }

    private fun consumeQuizIntent(intent: Intent?) {
        QuizRequest.fromIntent(intent)?.let { quizRequest = it }
        setIntent(Intent(this, MainActivity::class.java)) // don't re-read it later
    }
}
