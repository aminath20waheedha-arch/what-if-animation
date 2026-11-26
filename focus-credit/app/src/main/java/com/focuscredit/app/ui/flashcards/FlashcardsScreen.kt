package com.focuscredit.app.ui.flashcards

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
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
import com.focuscredit.app.data.Flashcard

/** Flashcards tab: list of subject decks, or one deck's cards when opened. */
@Composable
fun FlashcardsTab(onQuiz: (String) -> Unit, vm: FlashcardsViewModel = viewModel()) {
    val decks by vm.decks.collectAsStateWithLifecycle()
    val openSubject by vm.openSubject.collectAsStateWithLifecycle()
    val cards by vm.openCards.collectAsStateWithLifecycle()

    val subject = openSubject
    if (subject == null) {
        DeckListScreen(decks, onOpen = vm::open, onCreate = vm::createSubject, onQuiz = onQuiz)
    } else {
        BackHandler { vm.open(null) }
        DeckScreen(
            subject = subject,
            cards = cards,
            onBack = { vm.open(null) },
            onSave = vm::saveCard,
            onDelete = vm::deleteCard,
            onDeleteAll = { vm.deleteAllCards(subject) },
            onQuiz = { onQuiz(subject) },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DeckListScreen(
    decks: List<Deck>,
    onOpen: (String) -> Unit,
    onCreate: (String) -> Unit,
    onQuiz: (String) -> Unit,
) {
    var creating by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Flashcards") }) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { creating = true },
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = { Text("New subject") },
            )
        },
    ) { padding ->
        if (decks.isEmpty()) {
            Box(Modifier.padding(padding).fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Text(
                    "No subjects yet.\nAdd a task on the Schedule tab, or tap \"New subject\".",
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        } else {
            LazyColumn(
                Modifier.padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    Text(
                        "Each quiz asks $QUIZ_CARD_COUNT questions, so every subject needs at least $QUIZ_CARD_COUNT cards. " +
                            "Writing the cards is studying too!",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                items(decks, key = { it.subject.lowercase() }) { deck ->
                    DeckCard(deck, onQuiz = { onQuiz(deck.subject) }) { onOpen(deck.subject) }
                }
            }
        }
    }

    if (creating) {
        var name by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { creating = false },
            title = { Text("New subject") },
            text = {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Subject name") },
                    placeholder = { Text("e.g. Chemistry") },
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(enabled = name.isNotBlank(), onClick = { onCreate(name); creating = false }) { Text("Create") }
            },
            dismissButton = { TextButton(onClick = { creating = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun DeckCard(deck: Deck, onQuiz: () -> Unit, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(deck.subject, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Text(
                    "${deck.cardCount} card" + if (deck.cardCount == 1) "" else "s",
                    style = MaterialTheme.typography.labelLarge,
                )
            }
            LinearProgressIndicator(
                progress = { (deck.cardCount.toFloat() / QUIZ_CARD_COUNT).coerceAtMost(1f) },
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (deck.quizReady) "✓ Ready for quizzes" else "Add ${deck.cardsNeeded} more to unlock quizzes",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (deck.quizReady) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                )
                if (deck.quizReady) TextButton(onClick = onQuiz) { Text("Practice quiz") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DeckScreen(
    subject: String,
    cards: List<Flashcard>,
    onBack: () -> Unit,
    onSave: (Flashcard) -> Unit,
    onDelete: (Flashcard) -> Unit,
    onDeleteAll: () -> Unit,
    onQuiz: () -> Unit,
) {
    // null = no editor; id 0 = new card
    var editing by remember { mutableStateOf<Flashcard?>(null) }
    var pendingDelete by remember { mutableStateOf<Flashcard?>(null) }
    var confirmDeleteAll by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(subject) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                },
                actions = {
                    if (cards.isNotEmpty()) {
                        IconButton(onClick = { confirmDeleteAll = true }) {
                            Icon(Icons.Filled.Delete, contentDescription = "Delete all cards")
                        }
                    }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { editing = Flashcard(subject = subject, question = "", answer = "") },
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = { Text("Add card") },
            )
        },
    ) { padding ->
        LazyColumn(
            Modifier.padding(padding),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { DeckCard(Deck(subject, cards.size), onQuiz = onQuiz) {} }
            if (cards.isEmpty()) {
                item {
                    Text(
                        "Tap \"Add card\" and write a question you should be able to answer after studying, " +
                            "plus its short answer.",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 16.dp),
                    )
                }
            }
            items(cards, key = { it.id }) { card ->
                FlashcardRow(card, onClick = { editing = card }, onDelete = { pendingDelete = card })
            }
        }
    }

    editing?.let { card ->
        CardEditorDialog(
            initial = card,
            onDismiss = { editing = null },
            onSave = { saved, addAnother ->
                onSave(saved)
                editing = if (addAnother) Flashcard(subject = subject, question = "", answer = "") else null
            },
        )
    }

    pendingDelete?.let { card ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete card?") },
            text = { Text(card.question) },
            confirmButton = { TextButton(onClick = { onDelete(card); pendingDelete = null }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
        )
    }

    if (confirmDeleteAll) {
        AlertDialog(
            onDismissRequest = { confirmDeleteAll = false },
            title = { Text("Delete all $subject cards?") },
            text = { Text("All ${cards.size} cards will be removed. Your scheduled tasks stay.") },
            confirmButton = { TextButton(onClick = { onDeleteAll(); confirmDeleteAll = false }) { Text("Delete all") } },
            dismissButton = { TextButton(onClick = { confirmDeleteAll = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun FlashcardRow(card: Flashcard, onClick: () -> Unit, onDelete: () -> Unit) {
    Card(
        Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(Modifier.padding(start = 16.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(card.question, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                Text(card.answer, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = onDelete) { Icon(Icons.Filled.Delete, contentDescription = "Delete card") }
        }
    }
}

@Composable
private fun CardEditorDialog(
    initial: Flashcard,
    onDismiss: () -> Unit,
    onSave: (card: Flashcard, addAnother: Boolean) -> Unit,
) {
    // Keyed on the card so "Save & add another" starts with empty fields.
    var question by remember(initial) { mutableStateOf(initial.question) }
    var answer by remember(initial) { mutableStateOf(initial.answer) }
    val isNew = initial.id == 0L
    val valid = question.isNotBlank() && answer.isNotBlank()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isNew) "New card" else "Edit card") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = question,
                    onValueChange = { question = it },
                    label = { Text("Question") },
                    placeholder = { Text("e.g. What is Newton's 2nd law?") },
                    minLines = 2,
                )
                OutlinedTextField(
                    value = answer,
                    onValueChange = { answer = it },
                    label = { Text("Answer") },
                    placeholder = { Text("e.g. F = ma") },
                    minLines = 1,
                )
            }
        },
        confirmButton = {
            Row {
                if (isNew) {
                    TextButton(enabled = valid, onClick = {
                        onSave(initial.copy(question = question, answer = answer), true)
                    }) { Text("Save & next") }
                }
                TextButton(enabled = valid, onClick = {
                    onSave(initial.copy(question = question, answer = answer), false)
                }) { Text("Save") }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
