/**
 * Accessible Seating Chart Component
 * Interactive wedding seating chart with full keyboard navigation and screen reader support
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAccessibility } from './AccessibilityProvider';
import AccessibleButton from './AccessibleButton';

const SeatingChart = ({
  tables = [],
  guests = [],
  onGuestMove,
  onTableSelect,
  editable = false,
  className = ''
}) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [draggedGuest, setDraggedGuest] = useState(null);
  const chartRef = useRef(null);
  const { announce, manageFocus, settings } = useAccessibility();

  // Calculate statistics
  const totalGuests = guests.length;
  const assignedGuests = guests.filter(g => g.tableId).length;
  const unassignedGuests = totalGuests - assignedGuests;

  // Keyboard navigation
  useEffect(() => {
    if (!chartRef.current) return;

    const handleKeyDown = (e) => {
      const tables = chartRef.current.querySelectorAll('[role="button"][data-table-id]');
      const currentIndex = Array.from(tables).findIndex(t => t === document.activeElement);

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < tables.length - 1) {
            tables[currentIndex + 1].focus();
          } else {
            tables[0].focus();
          }
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            tables[currentIndex - 1].focus();
          } else {
            tables[tables.length - 1].focus();
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (document.activeElement.dataset.tableId) {
            handleTableSelect(document.activeElement.dataset.tableId);
          }
          break;

        case 'Escape':
          setSelectedTable(null);
          setSelectedGuest(null);
          announce('Selection cleared');
          break;
      }
    };

    chartRef.current.addEventListener('keydown', handleKeyDown);
    return () => chartRef.current?.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle table selection
  const handleTableSelect = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    setSelectedTable(table);
    
    if (onTableSelect) {
      onTableSelect(table);
    }

    announce(`Selected ${table.name}. ${table.assignedGuests} of ${table.seats} seats filled.`);
  };

  // Handle guest selection
  const handleGuestSelect = (guest) => {
    setSelectedGuest(guest);
    announce(`Selected ${guest.name}`);
  };

  // Handle drag and drop for mouse users
  const handleDragStart = (e, guest) => {
    if (!editable) return;
    setDraggedGuest(guest);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    if (!editable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, tableId) => {
    e.preventDefault();
    if (!editable || !draggedGuest) return;

    const table = tables.find(t => t.id === tableId);
    if (table.assignedGuests < table.seats) {
      if (onGuestMove) {
        onGuestMove(draggedGuest.id, tableId);
      }
      announce(`${draggedGuest.name} moved to ${table.name}`);
    } else {
      announce(`${table.name} is full. Cannot add more guests.`, 'assertive');
    }

    setDraggedGuest(null);
  };

  // Move guest with keyboard
  const moveGuestToTable = (guestId, tableId) => {
    if (!editable) return;

    const guest = guests.find(g => g.id === guestId);
    const table = tables.find(t => t.id === tableId);

    if (table.assignedGuests < table.seats) {
      if (onGuestMove) {
        onGuestMove(guestId, tableId);
      }
      announce(`${guest.name} moved to ${table.name}`);
    } else {
      announce(`${table.name} is full. Cannot add more guests.`, 'assertive');
    }
  };

  // Render table
  const renderTable = (table) => {
    const tableGuests = guests.filter(g => g.tableId === table.id);
    const isSelected = selectedTable?.id === table.id;
    const isFull = table.assignedGuests >= table.seats;

    return (
      <div
        key={table.id}
        data-table-id={table.id}
        role="button"
        tabIndex={0}
        aria-label={`${table.name}: ${table.assignedGuests} of ${table.seats} seats filled`}
        aria-pressed={isSelected}
        onClick={() => handleTableSelect(table.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, table.id)}
        className={`
          table-container relative p-4 border-2 rounded-lg cursor-pointer
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isFull ? 'bg-red-50' : ''}
          ${settings.highContrastMode ? 'border-4' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
      >
        <h3 className="text-lg font-semibold mb-2">
          {table.name}
          {isFull && <span className="ml-2 text-red-600">(Full)</span>}
        </h3>
        
        <div className="text-sm text-gray-600 mb-3">
          {table.assignedGuests}/{table.seats} seats
        </div>

        {/* Guest list */}
        <ul className="space-y-1" role="list" aria-label={`Guests at ${table.name}`}>
          {tableGuests.map(guest => (
            <li
              key={guest.id}
              draggable={editable}
              onDragStart={(e) => handleDragStart(e, guest)}
              className={`
                p-2 rounded text-sm
                ${selectedGuest?.id === guest.id ? 'bg-blue-100' : 'bg-gray-100'}
                ${editable ? 'cursor-move' : ''}
              `}
              onClick={() => handleGuestSelect(guest)}
            >
              <span>{guest.name}</span>
              {guest.dietaryRestrictions && (
                <span className="ml-2 text-xs text-gray-500">
                  ({guest.dietaryRestrictions})
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Empty seats */}
        {table.assignedGuests < table.seats && (
          <div className="mt-2 text-sm text-gray-500">
            {table.seats - table.assignedGuests} empty seat{table.seats - table.assignedGuests !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`seating-chart ${className}`}>
      {/* Header with statistics */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Seating Chart</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">Total Guests:</span> {totalGuests}
          </div>
          <div>
            <span className="font-semibold">Assigned:</span> {assignedGuests}
          </div>
          <div>
            <span className="font-semibold">Unassigned:</span> {unassignedGuests}
          </div>
        </div>
      </div>

      {/* Instructions for screen readers */}
      <div className="sr-only" role="region" aria-label="Seating chart instructions">
        <p>
          This is an interactive seating chart with {tables.length} tables.
          Use arrow keys to navigate between tables, Enter or Space to select a table.
          {editable && ' You can drag and drop guests between tables or use the move buttons.'}
        </p>
      </div>

      {/* Tables grid */}
      <div
        ref={chartRef}
        role="application"
        aria-label="Wedding seating chart"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {tables.map(renderTable)}
      </div>

      {/* Unassigned guests */}
      {unassignedGuests > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Unassigned Guests</h3>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2" role="list">
            {guests.filter(g => !g.tableId).map(guest => (
              <li
                key={guest.id}
                draggable={editable}
                onDragStart={(e) => handleDragStart(e, guest)}
                className={`
                  p-3 bg-yellow-50 border border-yellow-200 rounded cursor-move
                  ${selectedGuest?.id === guest.id ? 'ring-2 ring-blue-500' : ''}
                `}
                onClick={() => handleGuestSelect(guest)}
              >
                <span className="font-medium">{guest.name}</span>
                {guest.plusOne && (
                  <span className="ml-1 text-sm text-gray-600">+1</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons for selected guest */}
      {editable && selectedGuest && selectedTable && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="mb-3">
            Move <strong>{selectedGuest.name}</strong> to <strong>{selectedTable.name}</strong>?
          </p>
          <div className="flex gap-3">
            <AccessibleButton
              variant="primary"
              onClick={() => moveGuestToTable(selectedGuest.id, selectedTable.id)}
              ariaLabel={`Move ${selectedGuest.name} to ${selectedTable.name}`}
            >
              Confirm Move
            </AccessibleButton>
            <AccessibleButton
              variant="secondary"
              onClick={() => {
                setSelectedGuest(null);
                setSelectedTable(null);
                announce('Move cancelled');
              }}
            >
              Cancel
            </AccessibleButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatingChart;