package com.focuscredit.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.focuscredit.app.data.Task
import com.focuscredit.app.data.TaskKind
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private enum class TimeField { START, END }

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddTaskScreen(
    existing: Task?,
    defaultDate: LocalDate,
    knownSubjects: List<String>,
    onSave: (Task) -> Unit,
    onCancel: () -> Unit,
) {
    var title by rememberSaveable { mutableStateOf(existing?.title ?: "") }
    var subject by rememberSaveable { mutableStateOf(existing?.subject ?: "") }
    var kind by rememberSaveable { mutableStateOf(existing?.kind ?: TaskKind.STUDY) }
    var start by rememberSaveable { mutableIntStateOf(existing?.startMinute ?: (19 * 60)) }
    var end by rememberSaveable { mutableIntStateOf(existing?.endMinute ?: (20 * 60)) }
    var repeating by rememberSaveable { mutableStateOf(existing?.isRepeating ?: false) }
    var repeatDays by rememberSaveable {
        mutableIntStateOf(existing?.repeatDays?.takeIf { it != 0 } ?: Task.dayBit(defaultDate.dayOfWeek))
    }
    var dateEpochDay by rememberSaveable {
        mutableStateOf(existing?.dateEpochDay ?: defaultDate.toEpochDay())
    }

    var pickingTime by remember { mutableStateOf<TimeField?>(null) }
    var pickingDate by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun trySave() {
        error = when {
            title.isBlank() -> "Give the task a name."
            subject.isBlank() -> "Pick or type a subject."
            end <= start -> "End time must be after start time."
            repeating && repeatDays == 0 -> "Choose at least one day to repeat on."
            else -> null
        }
        if (error != null) return
        onSave(
            Task(
                id = existing?.id ?: 0,
                title = title.trim(),
                subject = subject.trim(),
                kind = kind,
                startMinute = start,
                endMinute = end,
                repeatDays = if (repeating) repeatDays else 0,
                dateEpochDay = if (repeating) null else dateEpochDay,
                createdAtMillis = existing?.createdAtMillis ?: System.currentTimeMillis(),
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (existing == null) "New task" else "Edit task") },
                navigationIcon = {
                    IconButton(onClick = onCancel) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("What will you do?") },
                placeholder = { Text("e.g. Revise chapter 3") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = subject,
                onValueChange = { subject = it },
                label = { Text("Subject") },
                placeholder = { Text("e.g. Physics") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            if (knownSubjects.isNotEmpty()) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    knownSubjects.forEach { s ->
                        FilterChip(
                            selected = subject.equals(s, ignoreCase = true),
                            onClick = { subject = s },
                            label = { Text(s) },
                        )
                    }
                }
            }

            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                TaskKind.entries.forEachIndexed { i, k ->
                    SegmentedButton(
                        selected = kind == k,
                        onClick = { kind = k },
                        shape = SegmentedButtonDefaults.itemShape(i, TaskKind.entries.size),
                    ) { Text(k.label) }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = { pickingTime = TimeField.START }, modifier = Modifier.weight(1f)) {
                    Text("Start  ${formatMinute(start)}")
                }
                OutlinedButton(onClick = { pickingTime = TimeField.END }, modifier = Modifier.weight(1f)) {
                    Text("End  ${formatMinute(end)}")
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Repeat every week", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                Switch(checked = repeating, onCheckedChange = { repeating = it })
            }

            if (repeating) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DayOfWeek.entries.forEach { day ->
                        val bit = Task.dayBit(day)
                        FilterChip(
                            selected = repeatDays and bit != 0,
                            onClick = { repeatDays = repeatDays xor bit },
                            label = { Text(day.getDisplayName(TextStyle.SHORT, Locale.getDefault())) },
                        )
                    }
                }
            } else {
                OutlinedButton(onClick = { pickingDate = true }, modifier = Modifier.fillMaxWidth()) {
                    Text("On " + LocalDate.ofEpochDay(dateEpochDay).format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy")))
                }
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            Button(onClick = ::trySave, modifier = Modifier.fillMaxWidth()) {
                Text(if (existing == null) "Add to schedule" else "Save changes")
            }
        }
    }

    pickingTime?.let { field ->
        val initial = if (field == TimeField.START) start else end
        val state = rememberTimePickerState(initialHour = initial / 60, initialMinute = initial % 60, is24Hour = false)
        AlertDialog(
            onDismissRequest = { pickingTime = null },
            title = { Text(if (field == TimeField.START) "Start time" else "End time") },
            text = { TimePicker(state = state) },
            confirmButton = {
                TextButton(onClick = {
                    val m = state.hour * 60 + state.minute
                    if (field == TimeField.START) {
                        val length = (end - start).coerceAtLeast(30)
                        start = m
                        if (end <= start) end = (start + length).coerceAtMost(23 * 60 + 59)
                    } else {
                        end = m
                    }
                    pickingTime = null
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingTime = null }) { Text("Cancel") } },
        )
    }

    if (pickingDate) {
        // DatePicker works in UTC milliseconds.
        val state = rememberDatePickerState(
            initialSelectedDateMillis = LocalDate.ofEpochDay(dateEpochDay).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        )
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let {
                        dateEpochDay = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toEpochDay()
                    }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state = state) }
    }
}
