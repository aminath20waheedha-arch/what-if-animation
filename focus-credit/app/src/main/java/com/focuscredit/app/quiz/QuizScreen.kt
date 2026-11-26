package com.focuscredit.app.quiz

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.focuscredit.app.credit.CreditKind
import com.focuscredit.app.credit.CreditOutcome

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuizScreen(request: QuizRequest, onClose: () -> Unit, vm: QuizViewModel = viewModel()) {
    LaunchedEffect(request) { vm.start(request) }
    val state by vm.state.collectAsStateWithLifecycle()
    var confirmQuit by remember { mutableStateOf(false) }

    // Leaving mid-quiz needs a confirmation; otherwise just close.
    val inProgress = state is QuizState.Asking
    val tryClose = { if (inProgress) confirmQuit = true else onClose() }
    BackHandler { tryClose() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("${request.subject} quiz") },
                navigationIcon = {
                    IconButton(onClick = tryClose) { Icon(Icons.Filled.Close, contentDescription = "Close quiz") }
                },
            )
        },
    ) { padding ->
        Box(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            when (val s = state) {
                QuizState.Loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                is QuizState.NotEnoughCards -> NotEnoughCards(request.subject, s.have, onClose)
                is QuizState.Asking -> Asking(s, onType = vm::type, onReveal = vm::reveal, onMark = vm::mark)
                is QuizState.Finished -> Finished(s, onClose)
            }
        }
    }

    if (confirmQuit) {
        AlertDialog(
            onDismissRequest = { confirmQuit = false },
            title = { Text("Quit the quiz?") },
            text = { Text("Your answers so far won't be saved.") },
            confirmButton = { TextButton(onClick = { confirmQuit = false; onClose() }) { Text("Quit") } },
            dismissButton = { TextButton(onClick = { confirmQuit = false }) { Text("Keep going") } },
        )
    }
}

@Composable
private fun NotEnoughCards(subject: String, have: Int, onClose: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Not enough cards yet", style = MaterialTheme.typography.headlineSmall)
        Text(
            "$subject has $have card${if (have == 1) "" else "s"}. A quiz needs ${QuizRules.QUESTIONS}. " +
                "Go to the Flashcards tab and add ${QuizRules.QUESTIONS - have} more.",
            style = MaterialTheme.typography.bodyLarge,
        )
        Button(onClick = onClose) { Text("OK") }
    }
}

@Composable
private fun Asking(
    s: QuizState.Asking,
    onType: (String) -> Unit,
    onReveal: () -> Unit,
    onMark: (Boolean) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Question ${s.index + 1} of ${s.total}", style = MaterialTheme.typography.labelLarge)
        LinearProgressIndicator(progress = { s.index.toFloat() / s.total }, modifier = Modifier.fillMaxWidth())

        Card(Modifier.fillMaxWidth()) {
            Text(
                s.card.question,
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(20.dp),
            )
        }

        OutlinedTextField(
            value = s.typed,
            onValueChange = onType,
            label = { Text("Your answer") },
            readOnly = s.revealed,
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )

        if (!s.revealed) {
            Button(onClick = onReveal, enabled = s.typed.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                Text("Check answer")
            }
            TextButton(onClick = { onMark(false) }, modifier = Modifier.fillMaxWidth()) { Text("I don't know (skip)") }
        } else {
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Correct answer", style = MaterialTheme.typography.labelLarge)
                    Text(s.card.answer, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    if (QuizRules.looksRight(s.typed, s.card.answer)) {
                        Text("✓ Your answer matches exactly", color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
            Text("Be honest. Did you get it right?", style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = { onMark(false) }, modifier = Modifier.weight(1f)) { Text("Missed it") }
                Button(onClick = { onMark(true) }, modifier = Modifier.weight(1f)) { Text("I got it") }
            }
        }
    }
}

@Composable
private fun Finished(s: QuizState.Finished, onDone: () -> Unit) {
    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("${s.correct} / ${s.total}", style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Bold)
        Text(
            if (s.passed) "Passed! 🎉" else "Not this time",
            style = MaterialTheme.typography.headlineSmall,
            color = if (s.passed) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
        )
        Text(
            if (s.passed) "Nice work. That session counts."
            else "You needed ${QuizRules.minToPass(s.total)} right to pass. Review the ones you missed below.",
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyLarge,
        )

        s.credit?.let { CreditLine(it) }

        if (s.missed.isNotEmpty()) {
            Text(
                "To review",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
            s.missed.forEach { card ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(card.question, fontWeight = FontWeight.SemiBold)
                        Text(card.answer, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        Button(onClick = onDone, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("Done") }
    }
}

@Composable
private fun CreditLine(outcome: CreditOutcome) {
    val (text, good) = when (outcome) {
        is CreditOutcome.Applied ->
            "${if (outcome.amount > 0) "+" else ""}${outcome.amount} credit · now ${outcome.newBalance}" to (outcome.amount > 0)
        CreditOutcome.Practice -> "Practice quiz: credit doesn't change" to true
        is CreditOutcome.AlreadyCounted -> when (outcome.existing) {
            CreditKind.MISSED -> "Too late: this session was already counted as missed" to false
            else -> "This session's quiz was already counted" to true
        }
    }
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (good) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(12.dp),
        )
    }
}
