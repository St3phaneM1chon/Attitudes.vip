/**
 * Tests d'intégration pour useGuests Hook
 * Tests complets avec mock Supabase et WebSocket
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGuests } from '../../src/hooks/useGuests';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

// Mock données de test
const mockGuests = [
  {
    id: '1',
    user_id: 'user_1',
    wedding_id: 'wedding_123',
    name: 'Sophie Martin',
    email: 'sophie@example.com',
    phone: '+33612345678',
    status: 'invited',
    table_number: 5,
    plus_one: true,
    plus_one_name: 'Marc Dubois',
    dietary_restrictions: 'Végétarien',
    invitation_sent_at: '2024-01-15T10:00:00Z',
    rsvp_status: 'pending',
    created_at: '2024-01-10T10:00:00Z',
    user: {
      id: 'user_1',
      email: 'sophie@example.com'
    }
  },
  {
    id: '2',
    user_id: 'user_2',
    wedding_id: 'wedding_123',
    name: 'Pierre Durand',
    email: 'pierre@example.com',
    phone: '+33623456789',
    status: 'confirmed',
    table_number: 3,
    plus_one: false,
    dietary_restrictions: null,
    invitation_sent_at: '2024-01-15T10:00:00Z',
    rsvp_status: 'accepted',
    rsvp_date: '2024-01-20T15:00:00Z',
    created_at: '2024-01-10T10:00:00Z',
    user: {
      id: 'user_2',
      email: 'pierre@example.com'
    }
  }
];

describe('useGuests Hook Integration Tests', () => {
  let mockSupabase;
  let mockChannel;

  beforeEach(() => {
    // Configuration du mock Supabase
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    };

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockGuests,
              error: null
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { ...mockGuests[0], id: '3', name: 'Nouveau Invité' },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: { ...mockGuests[0], rsvp_status: 'accepted' },
                error: null
              }))
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn()
    };

    createClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Chargement initial', () => {
    it('devrait charger les invités au montage', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.guests).toHaveLength(2);
      expect(result.current.stats.total).toBe(2);
      expect(result.current.stats.confirmed).toBe(1);
      expect(result.current.stats.pending).toBe(1);
    });

    it('devrait gérer les erreurs de chargement', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: null,
              error: new Error('Database error')
            }))
          }))
        }))
      });

      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load guests');
      expect(result.current.guests).toEqual([]);
    });
  });

  describe('Opérations CRUD', () => {
    it('devrait ajouter un nouvel invité', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newGuest = {
        name: 'Marie Leblanc',
        email: 'marie@example.com',
        phone: '+33634567890',
        table_number: 7,
        plus_one: false
      };

      await act(async () => {
        const addedGuest = await result.current.actions.addGuest(newGuest);
        expect(addedGuest).toBeTruthy();
        expect(addedGuest.name).toBe('Nouveau Invité');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_guests');
    });

    it('devrait mettre à jour un invité', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const updates = {
        rsvp_status: 'accepted',
        dietary_restrictions: 'Sans gluten'
      };

      await act(async () => {
        const success = await result.current.actions.updateGuest('1', updates);
        expect(success).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_guests');
      expect(mockSupabase.from().update).toHaveBeenCalledWith(updates);
    });

    it('devrait supprimer un invité', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const success = await result.current.actions.deleteGuest('1');
        expect(success).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wedding_guests');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });
  });

  describe('Filtrage et recherche', () => {
    it('devrait filtrer les invités par statut', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        const filtered = result.current.actions.filterGuests({ status: 'confirmed' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Pierre Durand');
      });
    });

    it('devrait filtrer par table', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        const filtered = result.current.actions.filterGuests({ table_number: 3 });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Pierre Durand');
      });
    });

    it('devrait filtrer par recherche textuelle', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        const filtered = result.current.actions.filterGuests({ search: 'Sophie' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Sophie Martin');
      });
    });
  });

  describe('WebSocket temps réel', () => {
    it('devrait s\'abonner aux changements temps réel', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockSupabase.channel).toHaveBeenCalledWith('guests_wedding_123');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'wedding_guests'
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('devrait gérer les insertions temps réel', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Simuler une insertion WebSocket
      const insertHandler = mockChannel.on.mock.calls[0][2];
      const newGuest = {
        id: '4',
        wedding_id: 'wedding_123',
        name: 'Nouvel Invité Temps Réel',
        email: 'nouveau@example.com',
        status: 'invited'
      };

      act(() => {
        insertHandler({
          eventType: 'INSERT',
          new: newGuest
        });
      });

      expect(result.current.guests).toHaveLength(3);
      expect(result.current.guests.find(g => g.id === '4')).toBeTruthy();
    });

    it('devrait gérer les mises à jour temps réel', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const updateHandler = mockChannel.on.mock.calls[0][2];
      
      act(() => {
        updateHandler({
          eventType: 'UPDATE',
          new: { ...mockGuests[0], rsvp_status: 'declined' }
        });
      });

      const updatedGuest = result.current.guests.find(g => g.id === '1');
      expect(updatedGuest.rsvp_status).toBe('declined');
    });

    it('devrait gérer les suppressions temps réel', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const deleteHandler = mockChannel.on.mock.calls[0][2];
      
      act(() => {
        deleteHandler({
          eventType: 'DELETE',
          old: { id: '1' }
        });
      });

      expect(result.current.guests).toHaveLength(1);
      expect(result.current.guests.find(g => g.id === '1')).toBeFalsy();
    });
  });

  describe('Export des données', () => {
    it('devrait exporter la liste au format CSV', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const csv = result.current.actions.exportGuestList('csv');
      
      expect(csv).toContain('Nom,Email,Téléphone,Table,Plus-un,Statut RSVP,Restrictions');
      expect(csv).toContain('Sophie Martin,sophie@example.com');
      expect(csv).toContain('Pierre Durand,pierre@example.com');
    });

    it('devrait exporter la liste au format JSON', async () => {
      const { result } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const json = result.current.actions.exportGuestList('json');
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Sophie Martin');
      expect(parsed[1].name).toBe('Pierre Durand');
    });
  });

  describe('Nettoyage', () => {
    it('devrait nettoyer les subscriptions au démontage', async () => {
      const { result, unmount } = renderHook(() => useGuests('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});