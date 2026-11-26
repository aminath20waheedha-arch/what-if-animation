package com.focuscredit.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.focuscredit.app.data.AppDatabase
import com.focuscredit.app.data.Task
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

class ScheduleViewModel(app: Application) : AndroidViewModel(app) {
    private val dao = AppDatabase.get(app).taskDao()
    private val allTasks = dao.observeAll()

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    val selectedDate: StateFlow<LocalDate> = _selectedDate.asStateFlow()

    /** Tasks that happen on the selected day, earliest first. */
    val tasksForDay: StateFlow<List<Task>> =
        combine(allTasks, _selectedDate) { tasks, date -> tasks.filter { it.occursOn(date) } }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /** Subjects you've used before, offered as quick picks when adding a task. */
    val knownSubjects: StateFlow<List<String>> =
        allTasks.map { tasks -> tasks.map { it.subject.trim() }.filter { it.isNotEmpty() }.distinct().sorted() }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun selectDate(date: LocalDate) {
        _selectedDate.value = date
    }

    fun save(task: Task) = viewModelScope.launch {
        if (task.id == 0L) dao.insert(task) else dao.update(task)
    }

    fun delete(task: Task) = viewModelScope.launch { dao.delete(task) }
}
