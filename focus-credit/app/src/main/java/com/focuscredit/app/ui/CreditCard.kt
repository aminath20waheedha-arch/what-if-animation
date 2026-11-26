package com.focuscredit.app.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.focuscredit.app.credit.CreditEvent
import com.focuscredit.app.credit.CreditKind
import com.focuscredit.app.credit.CreditRules
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Balance at the top of the Schedule tab; tap to see recent changes. */
@Composable
fun CreditCard(balance: Int, history: List<CreditEvent>) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val colors = MaterialTheme.colorScheme
    val tint = when {
        balance == 0 -> colors.error
        balance <= 30 -> colors.tertiary
        else -> colors.primary
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable { expanded = !expanded }
            .animateContentSize(),
        colors = CardDefaults.cardColors(containerColor = if (balance == 0) colors.errorContainer else colors.surfaceVariant),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text("Credit", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Text("$balance", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = tint)
                Text(" / ${CreditRules.MAX}", style = MaterialTheme.typography.bodyMedium)
            }
            LinearProgressIndicator(
                progress = { balance.toFloat() / CreditRules.MAX },
                color = tint,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                when {
                    balance == 0 -> "Out of credit: TikTok & Instagram are locked. Pass a scheduled session's quiz to earn some back."
                    balance <= 30 -> "Running low. Don't skip your next session!"
                    else -> "Pass a quiz +${CreditRules.PASSED} · fail ${CreditRules.FAILED} · skip ${CreditRules.MISSED}"
                },
                style = MaterialTheme.typography.bodySmall,
            )

            if (expanded) {
                Text("Recent", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
                if (history.isEmpty()) {
                    Text("Nothing yet. Finish a session and take its quiz.", style = MaterialTheme.typography.bodySmall)
                }
                history.take(10).forEach { HistoryRow(it) }
            } else if (history.isNotEmpty()) {
                Text("Tap to see history", style = MaterialTheme.typography.labelSmall, color = colors.onSurfaceVariant)
            }
        }
    }
}

private val dayFormat = DateTimeFormatter.ofPattern("EEE d MMM")

@Composable
private fun HistoryRow(e: CreditEvent) {
    val what = when (e.kind) {
        CreditKind.PASSED -> "Passed quiz"
        CreditKind.FAILED -> "Failed quiz"
        CreditKind.MISSED -> "Missed session"
    }
    val day = Instant.ofEpochMilli(e.atMillis).atZone(ZoneId.systemDefault()).format(dayFormat)
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            (if (e.amount > 0) "+" else "") + e.amount,
            fontWeight = FontWeight.Bold,
            color = if (e.amount > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
            modifier = Modifier.width(44.dp),
        )
        Column(Modifier.weight(1f)) {
            Text("$what: ${e.title}", style = MaterialTheme.typography.bodyMedium)
            Text("${e.subject} · $day", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
