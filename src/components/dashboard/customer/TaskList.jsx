import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const TaskList = ({ tasks = [], onTaskUpdate }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');

  const filters = [
    { id: 'all', label: t('dashboard.tasks.filters.all') },
    { id: 'urgent', label: t('dashboard.tasks.filters.urgent') },
    { id: 'pending', label: t('dashboard.tasks.filters.pending') },
    { id: 'completed', label: t('dashboard.tasks.filters.completed') }
  ];

  const getFilteredTasks = () => {
    let filtered = [...tasks];
    
    if (filter === 'urgent') {
      filtered = filtered.filter(task => task.priority === 'urgent' && task.status !== 'completed');
    } else if (filter === 'pending') {
      filtered = filtered.filter(task => task.status === 'pending');
    } else if (filter === 'completed') {
      filtered = filtered.filter(task => task.status === 'completed');
    }

    // Sort tasks
    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

    return filtered;
  };

  const toggleTaskStatus = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      
      // TODO: API call to update task status
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      onTaskUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'text-red-600 bg-red-50',
      high: 'text-orange-600 bg-orange-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-green-600 bg-green-50'
    };
    return colors[priority] || colors.medium;
  };

  const formatDueDate = (date) => {
    const dueDate = new Date(date);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: t('dashboard.tasks.overdue', { days: Math.abs(diffDays) }), color: 'text-red-600' };
    } else if (diffDays === 0) {
      return { text: t('dashboard.tasks.today'), color: 'text-orange-600' };
    } else if (diffDays === 1) {
      return { text: t('dashboard.tasks.tomorrow'), color: 'text-yellow-600' };
    } else if (diffDays <= 7) {
      return { text: t('dashboard.tasks.thisWeek'), color: 'text-blue-600' };
    } else {
      return { text: t('dashboard.tasks.inDays', { days: diffDays }), color: 'text-gray-600' };
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {t('dashboard.tasks.title')}
        </h2>
        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          + {t('dashboard.tasks.addTask')}
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="dueDate">{t('dashboard.tasks.sortByDue')}</option>
          <option value="priority">{t('dashboard.tasks.sortByPriority')}</option>
        </select>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          {t('dashboard.tasks.noTasks')}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const dueInfo = formatDueDate(task.dueDate);
            
            return (
              <div
                key={task.id}
                className={`border rounded-lg p-4 transition-all ${
                  task.status === 'completed' ? 'bg-gray-50 opacity-75' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => toggleTaskStatus(task.id)}
                    className="mt-1 h-5 w-5 text-orange-600 rounded focus:ring-orange-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-medium ${
                        task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                      }`}>
                        {task.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {t(`dashboard.tasks.priority.${task.priority}`)}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className={dueInfo.color}>
                        📅 {dueInfo.text}
                      </span>
                      
                      {task.assignedTo && (
                        <span className="text-gray-500">
                          👤 {task.assignedTo}
                        </span>
                      )}
                    </div>
                    
                    {task.category && (
                      <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {t(`dashboard.tasks.categories.${task.category}`)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskList;