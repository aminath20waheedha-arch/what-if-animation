package com.focuscredit.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import com.focuscredit.app.data.Task
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.TemporalAdjusters
import java.util.Locale

/** Top-level app: shows the schedule, or the add/edit form on top of it. */
@Composable
fun ScheduleApp(vm: ScheduleViewModel = viewModel()) {
    val selectedDate by vm.selectedDate.collectAsStateWithLifecycle()
    val tasks by vm.tasksForDay.collectAsStateWithLifecycle()
    val subjects by vm.knownSubjects.collectAsStateWithLifecycle()

    // null = schedule visible; non-null = editing that task (id 0 means a new one)
    var editing by remember { mutableStateOf<Task?>(null) }
    var creating by remember { mutableStateOf(false) }

    if (creating || editing != null) {
        BackHandler { creating = false; editing = null }
        AddTaskScreen(
            existing = editing,
            defaultDate = selectedDate,
            knownSubjects = subjects,
            onSave = { vm.save(it); creating = false; editing = null },
            onCancel = { creating = false; editing = null },
        )
    } else {
        ScheduleScreen(
            selectedDate = selectedDate,
            tasks = tasks,
            onSelectDate = vm::selectDate,
            onAdd = { creating = true },
            onEdit = { editing = it },
            onDelete = vm::delete,
            onExactAlarmsGranted = vm::rescheduleReminders,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    selectedDate: LocalDate,
    tasks: List<Task>,
    onSelectDate: (LocalDate) -> Unit,
    onAdd: () -> Unit,
    onEdit: (Task) -> Unit,
    onDelete: (Task) -> Unit,
    onExactAlarmsGranted: () -> Unit = {},
) {
    var pendingDelete by remember { mutableStateOf<Task?>(null) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("My Schedule") }) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAdd,
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                text = { Text("Add task") },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            ReminderPermissionBanner(onExactAlarmsGranted)
            WeekStrip(selectedDate, onSelectDate)
            Text(
                text = selectedDate.format(DateTimeFormatter.ofPattern("EEEE, d MMMM")),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            if (tasks.isEmpty()) {
                EmptyDay()
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(tasks, key = { it.id }) { task ->
                        TaskCard(task, onClick = { onEdit(task) }, onDelete = { pendingDelete = task })
                    }
                }
            }
        }
    }

    pendingDelete?.let { task ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete task?") },
            text = {
                Text(
                    if (task.isRepeating) "\"${task.title}\" repeats every week. Deleting removes it from all days."
                    else "\"${task.title}\" will be removed."
                )
            },
            confirmButton = {
                TextButton(onClick = { onDelete(task); pendingDelete = null }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
        )
    }
}

/** Mon–Sun strip for the week containing [selected]. */
@Composable
private fun WeekStrip(selected: LocalDate, onSelect: (LocalDate) -> Unit) {
    val monday = selected.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    val today = LocalDate.now()
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        TextButton(onClick = { onSelect(selected.minusWeeks(1)) }) { Text("‹") }
        (0L..6L).forEach { offset ->
            val day = monday.plusDays(offset)
            val isSelected = day == selected
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.clickable { onSelect(day) },
            ) {
                Column(
                    Modifier.padding(horizontal = 6.dp, vertical = 6.dp).width(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        day.dayOfWeek.getDisplayName(TextStyle.NARROW, Locale.getDefault()),
                        style = MaterialTheme.typography.labelSmall,
                    )
                    Text(
                        day.dayOfMonth.toString(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = if (day == today) FontWeight.Bold else FontWeight.Normal,
                    )
                }
            }
        }
        TextButton(onClick = { onSelect(selected.plusWeeks(1)) }) { Text("›") }
    }
}

@Composable
private fun TaskCard(task: Task, onClick: () -> Unit, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(Modifier.padding(start = 16.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    "${formatMinute(task.startMinute)} – ${formatMinute(task.endMinute)}",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(task.title, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(onClick = onClick, label = { Text(task.subject) })
                    AssistChip(onClick = onClick, label = { Text(task.kind.label) })
                }
                Text(repeatSummary(task), style = MaterialTheme.typography.bodySmall)
            }
            IconButton(onClick = onDelete) { Icon(Icons.Filled.Delete, contentDescription = "Delete") }
        }
    }
}

@Composable
private fun EmptyDay() {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(
            "Nothing scheduled.\nTap \"Add task\" to plan a study session or class.",
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}

fun formatMinute(minute: Int): String = "%02d:%02d".format(minute / 60, minute % 60)

fun repeatSummary(task: Task): String {
    if (!task.isRepeating) return "One time"
    val days = DayOfWeek.entries.filter { task.repeatDays and Task.dayBit(it) != 0 }
    val weekend = setOf(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY)
    return when {
        days.size == 7 -> "Every day"
        days.size == 5 && days.none { it in weekend } -> "Weekdays"
        else ->"Every " + days.joinToString(", ") { it.getDisplayName(TextStyle.SHORT, Locale.getDefault()) }
    }
}
