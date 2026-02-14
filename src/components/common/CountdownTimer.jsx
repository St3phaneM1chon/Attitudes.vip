/**
 * CountdownTimer - Composant de compte à rebours animé
 * Support de multiples formats et auto-update
 */

import React, { useState, useEffect, memo } from 'react';

export const CountdownTimer = memo(function CountdownTimer({ 
  targetDate, 
  format = 'full', // full, days, hours, minutes
  className = '',
  onComplete,
  showLabels = true,
  compact = false
}) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  function calculateTimeLeft() {
    const difference = new Date(targetDate) - new Date();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }
    
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      expired: false
    };
  }
  
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.expired && onComplete) {
        onComplete();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate]);
  
  const formatValue = (value) => {
    return value.toString().padStart(2, '0');
  };
  
  const getTimeUnits = () => {
    switch (format) {
      case 'days':
        return [{ value: timeLeft.days, label: 'jours' }];
      case 'hours':
        return [
          { value: timeLeft.days * 24 + timeLeft.hours, label: 'heures' }
        ];
      case 'minutes':
        return [
          { value: (timeLeft.days * 24 + timeLeft.hours) * 60 + timeLeft.minutes, label: 'minutes' }
        ];
      default: // full
        return [
          { value: timeLeft.days, label: 'jours' },
          { value: timeLeft.hours, label: 'heures' },
          { value: timeLeft.minutes, label: 'minutes' },
          { value: timeLeft.seconds, label: 'secondes' }
        ];
    }
  };
  
  if (timeLeft.expired) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-2xl font-bold text-green-600">C'est maintenant ! 🎉</p>
      </div>
    );
  }
  
  const units = getTimeUnits();
  
  if (compact) {
    return (
      <span className={`font-mono ${className}`}>
        {units.map((unit, index) => (
          <span key={unit.label}>
            {index > 0 && ':'}
            {formatValue(unit.value)}
          </span>
        ))}
      </span>
    );
  }
  
  return (
    <div className={`flex items-center justify-center space-x-4 ${className}`}>
      {units.map((unit, index) => (
        <div key={unit.label} className="text-center">
          <div className="relative">
            {/* Cercle de fond */}
            <svg className="w-20 h-20" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gray-200"
              />
              {/* Cercle de progression */}
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(unit.value / (index === 0 ? 365 : index === 1 ? 24 : 60)) * 220} 220`}
                strokeDashoffset="0"
                transform="rotate(-90 40 40)"
                className="text-pink-500 transition-all duration-300"
              />
            </svg>
            
            {/* Valeur */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">
                {formatValue(unit.value)}
              </span>
            </div>
          </div>
          
          {/* Label */}
          {showLabels && (
            <p className="mt-2 text-sm text-gray-600">{unit.label}</p>
          )}
        </div>
      ))}
    </div>
  );
});

// Version simplifiée pour affichage inline
export const CountdownTimerInline = memo(function CountdownTimerInline({ 
  targetDate, 
  className = '' 
}) {
  const [timeString, setTimeString] = useState('');
  
  useEffect(() => {
    const updateTime = () => {
      const difference = new Date(targetDate) - new Date();
      
      if (difference <= 0) {
        setTimeString('Maintenant !');
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      
      if (days > 0) {
        setTimeString(`${days}j ${hours}h`);
      } else if (hours > 0) {
        setTimeString(`${hours}h ${minutes}m`);
      } else {
        setTimeString(`${minutes}m`);
      }
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [targetDate]);
  
  return <span className={className}>{timeString}</span>;
});