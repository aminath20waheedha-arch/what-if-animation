package com.focuscredit.app.blocker

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuscredit.app.MainActivity
import com.focuscredit.app.credit.CreditRules
import com.focuscredit.app.ui.theme.FocusCreditTheme

/** Full-screen "locked" page shown instead of TikTok / Instagram at 0 credit. */
class BlockedActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val appName = intent.getStringExtra(EXTRA_APP_NAME) ?: "This app"
        val preview = intent.getBooleanExtra(EXTRA_PREVIEW, false)
        // Back goes home, never back into the locked app.
        onBackPressedDispatcher.addCallback(this) { if (preview) finish() else goHome() }
        setContent {
            FocusCreditTheme {
                BlockedScreen(
                    appName = appName,
                    preview = preview,
                    onOpenApp = {
                        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                        finish()
                    },
                    onHome = { if (preview) finish() else goHome() },
                )
            }
        }
    }

    private fun goHome() {
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    companion object {
        const val EXTRA_APP_NAME = "app_name"
        const val EXTRA_PREVIEW = "preview"
    }
}

@Composable
private fun BlockedScreen(appName: String, preview: Boolean, onOpenApp: () -> Unit, onHome: () -> Unit) {
    Surface(color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.fillMaxSize()) {
        Column(
            Modifier.safeDrawingPadding().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        ) {
            if (preview) Text("Preview, this is what you'll see", style = MaterialTheme.typography.labelLarge)
            Text("🔒", fontSize = 72.sp)
            Text(
                "$appName is locked",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Text(
                "You're out of credit.",
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center,
            )
            Text(
                "To unlock it: open Focus Credit, do a scheduled study session, and pass its quiz. " +
                    "Each pass gives +${CreditRules.PASSED} credit.",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
            )
            Button(onClick = onOpenApp, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("Open Focus Credit") }
            TextButton(onClick = onHome) { Text(if (preview) "Close preview" else "Go to home screen") }
        }
    }
}
