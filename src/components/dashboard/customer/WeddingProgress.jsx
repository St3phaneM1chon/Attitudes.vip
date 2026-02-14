import React from 'react';
import { useTranslation } from 'react-i18next';

const WeddingProgress = ({ tasks, daysUntilWedding }) => {
  const { t } = useTranslation();
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getProgressColor = () => {
    if (progressPercentage >= 80) return 'bg-green-500';
    if (progressPercentage >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getUrgentTasks = () => {
    return tasks
      .filter(task => task.status !== 'completed' && task.priority === 'urgent')
      .slice(0, 3);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {t('dashboard.progress.title')}
      </h2>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{t('dashboard.progress.tasksCompleted')}</span>
          <span className="font-semibold">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`${getProgressColor()} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {completedTasks} {t('dashboard.progress.of')} {totalTasks} {t('dashboard.progress.tasks')}
        </p>
      </div>

      {/* Urgent Tasks */}
      {getUrgentTasks().length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-red-600 mb-3">
            {t('dashboard.progress.urgentTasks')}
          </h3>
          <ul className="space-y-2">
            {getUrgentTasks().map((task) => (
              <li key={task.id} className="flex items-start">
                <span className="text-red-500 mr-2">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{task.title}</p>
                  <p className="text-xs text-gray-500">
                    {t('dashboard.progress.dueIn')} {task.daysUntilDue} {t('dashboard.progress.days')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Countdown */}
      {daysUntilWedding !== undefined && (
        <div className="mt-4 text-center p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-gray-600">{t('dashboard.progress.countdown')}</p>
          <p className="text-2xl font-bold text-orange-600">
            {daysUntilWedding} {t('dashboard.progress.daysLeft')}
          </p>
        </div>
      )}
    </div>
  );
};

export default WeddingProgress;